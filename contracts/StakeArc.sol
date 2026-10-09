// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StakeArc
/// @notice USDC staking contract with optional commit durations for boosted APY rewards.
/// @dev Receipt balance (stARC) is tracked internally as a 1:1 accounting mapping.
contract StakeArc is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_BASE_APY_BPS = 5_000; // 50%
    uint256 public constant BASE_APY_BPS_DEFAULT = 800; // 8%
    uint256 public constant YEAR_IN_SECONDS = 365 days;

    uint256 public constant DURATION_7_DAYS = 7 days;
    uint256 public constant DURATION_30_DAYS = 30 days;
    uint256 public constant DURATION_90_DAYS = 90 days;

    uint256 public constant BONUS_7_DAYS_BPS = 200; // +2%
    uint256 public constant BONUS_30_DAYS_BPS = 400; // +4%
    uint256 public constant BONUS_90_DAYS_BPS = 800; // +8%

    IERC20 public immutable usdc;

    uint256 public totalStaked;
    uint256 public rewardPool;
    uint256 public baseApyBps;

    struct UserPosition {
        uint256 stakedAmount;
        uint256 commitAmount;
        uint256 commitStart;
        uint256 commitDuration;
        uint256 lastRewardTimestamp;
        uint256 pendingRewards;
        uint256 stArcBalance;
    }

    mapping(address => UserPosition) private _positions;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Committed(address indexed user, uint256 amount, uint256 startTime, uint256 duration);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDeposited(address indexed owner, uint256 amount);

    /// @param usdcAddress USDC token address on Arc.
    constructor(address usdcAddress) Ownable(msg.sender) {
        require(usdcAddress != address(0), "StakeArc: zero USDC");
        usdc = IERC20(usdcAddress);
        baseApyBps = BASE_APY_BPS_DEFAULT;
    }

    /// @notice Returns the tracked position for a user.
    function positionOf(address user) external view returns (UserPosition memory) {
        return _positions[user];
    }

    /// @notice Deposit USDC and mint internal stARC accounting units 1:1.
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "StakeArc: amount is zero");

        UserPosition storage p = _positions[msg.sender];
        _accrueRewards(p);

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        p.stakedAmount += amount;
        p.stArcBalance += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /// @notice Burn internal stARC and withdraw USDC principal.
    /// @dev Active committed amounts remain locked and cannot be unstaked.
    function unstake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "StakeArc: amount is zero");

        UserPosition storage p = _positions[msg.sender];
        _accrueRewards(p);

        require(p.stArcBalance >= amount, "StakeArc: insufficient stARC");
        require(p.stakedAmount >= amount, "StakeArc: insufficient stake");

        uint256 lockedAmount = _lockedAmount(p);
        require(p.stakedAmount - amount >= lockedAmount, "StakeArc: committed stake locked");

        p.stakedAmount -= amount;
        p.stArcBalance -= amount;
        totalStaked -= amount;

        usdc.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /// @notice Commit a portion of staked USDC for boosted rewards.
    /// @param amount Portion of currently staked USDC to lock.
    /// @param duration One of: 7 days, 30 days, 90 days.
    function commit(uint256 amount, uint256 duration) external whenNotPaused nonReentrant {
        require(amount > 0, "StakeArc: amount is zero");
        require(_isValidDuration(duration), "StakeArc: invalid duration");

        UserPosition storage p = _positions[msg.sender];
        _accrueRewards(p);

        require(p.stakedAmount >= amount, "StakeArc: insufficient stake");
        require(!_hasActiveCommit(p), "StakeArc: active commit exists");

        p.commitAmount = amount;
        p.commitStart = block.timestamp;
        p.commitDuration = duration;

        emit Committed(msg.sender, amount, p.commitStart, duration);
    }

    /// @notice Claim accrued rewards paid from the owner-funded reward pool.
    function claimRewards() external whenNotPaused nonReentrant {
        UserPosition storage p = _positions[msg.sender];
        _accrueRewards(p);

        uint256 rewards = p.pendingRewards;
        require(rewards > 0, "StakeArc: no rewards");
        require(rewardPool >= rewards, "StakeArc: insufficient reward pool");

        p.pendingRewards = 0;
        rewardPool -= rewards;

        usdc.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    /// @notice Owner deposits USDC rewards into the pool.
    function depositRewards(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "StakeArc: amount is zero");

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;

        emit RewardsDeposited(msg.sender, amount);
    }

    /// @notice Set base APY in basis points.
    /// @dev Capped at 50% (5000 bps).
    function setBaseApyBps(uint256 newBaseApyBps) external onlyOwner {
        require(newBaseApyBps <= MAX_BASE_APY_BPS, "StakeArc: APY too high");
        baseApyBps = newBaseApyBps;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Returns currently locked committed amount for a user.
    function lockedAmountOf(address user) external view returns (uint256) {
        return _lockedAmount(_positions[user]);
    }

    /// @notice Preview total claimable rewards (stored + accrued since last action).
    function claimableRewards(address user) external view returns (uint256) {
        UserPosition memory p = _positions[user];

        if (p.lastRewardTimestamp == 0) {
            return p.pendingRewards;
        }

        uint256 elapsed = block.timestamp - p.lastRewardTimestamp;
        uint256 baseReward = _rewardFor(p.stakedAmount, baseApyBps, elapsed);
        uint256 bonusReward;

        if (p.commitAmount > 0) {
            uint256 commitEnd = p.commitStart + p.commitDuration;
            if (p.lastRewardTimestamp < commitEnd) {
                uint256 bonusUntil = block.timestamp < commitEnd ? block.timestamp : commitEnd;
                if (bonusUntil > p.lastRewardTimestamp) {
                    uint256 bonusElapsed = bonusUntil - p.lastRewardTimestamp;
                    bonusReward = _rewardFor(
                        p.commitAmount,
                        _bonusApyBpsForDuration(p.commitDuration),
                        bonusElapsed
                    );
                }
            }
        }

        return p.pendingRewards + baseReward + bonusReward;
    }

    function _accrueRewards(UserPosition storage p) internal {
        if (p.lastRewardTimestamp == 0) {
            p.lastRewardTimestamp = block.timestamp;
            return;
        }

        if (p.stakedAmount == 0) {
            p.lastRewardTimestamp = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - p.lastRewardTimestamp;
        if (elapsed == 0) {
            return;
        }

        uint256 baseReward = _rewardFor(p.stakedAmount, baseApyBps, elapsed);

        uint256 bonusReward;
        if (p.commitAmount > 0) {
            uint256 commitEnd = p.commitStart + p.commitDuration;
            if (p.lastRewardTimestamp < commitEnd) {
                uint256 bonusUntil = block.timestamp < commitEnd ? block.timestamp : commitEnd;
                if (bonusUntil > p.lastRewardTimestamp) {
                    uint256 bonusElapsed = bonusUntil - p.lastRewardTimestamp;
                    bonusReward = _rewardFor(
                        p.commitAmount,
                        _bonusApyBpsForDuration(p.commitDuration),
                        bonusElapsed
                    );
                }
            }
        }

        p.pendingRewards += baseReward + bonusReward;
        p.lastRewardTimestamp = block.timestamp;
    }

    function _rewardFor(uint256 principal, uint256 apyBps, uint256 elapsed)
        internal
        pure
        returns (uint256)
    {
        if (principal == 0 || apyBps == 0 || elapsed == 0) {
            return 0;
        }

        // Linear accrual:
        // reward = principal * apyBps / 10_000 * elapsed / YEAR_IN_SECONDS
        return (principal * apyBps * elapsed) / (BPS_DENOMINATOR * YEAR_IN_SECONDS);
    }

    function _hasActiveCommit(UserPosition storage p) internal view returns (bool) {
        if (p.commitAmount == 0 || p.commitDuration == 0) {
            return false;
        }
        return block.timestamp < p.commitStart + p.commitDuration;
    }

    function _lockedAmount(UserPosition storage p) internal view returns (uint256) {
        return _hasActiveCommit(p) ? p.commitAmount : 0;
    }

    function _isValidDuration(uint256 duration) internal pure returns (bool) {
        return duration == DURATION_7_DAYS || duration == DURATION_30_DAYS || duration == DURATION_90_DAYS;
    }

    function _bonusApyBpsForDuration(uint256 duration) internal pure returns (uint256) {
        if (duration == DURATION_7_DAYS) {
            return BONUS_7_DAYS_BPS;
        }
        if (duration == DURATION_30_DAYS) {
            return BONUS_30_DAYS_BPS;
        }
        if (duration == DURATION_90_DAYS) {
            return BONUS_90_DAYS_BPS;
        }
        return 0;
    }
}
