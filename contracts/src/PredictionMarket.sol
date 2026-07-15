// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPredictionMarket} from "./interfaces/IPredictionMarket.sol";

/// @title PredictionMarket
/// @notice Transparent, on-chain, points-based World Cup prediction game deployed on Injective's
///         EVM (inEVM) execution layer. No wagering of funds occurs here — this contract exists to
///         make predictions verifiable and tamper-proof, which is the trust problem WorldCupIQ solves
///         relative to opaque, centralized prediction apps.
contract PredictionMarket is IPredictionMarket {
    address public owner;

    mapping(bytes32 => Match) public matches;
    mapping(bytes32 => mapping(address => Prediction)) public predictions;
    mapping(bytes32 => address[]) private _predictorsByMatch;
    mapping(address => uint256) public leaderboard;

    uint256 public constant CORRECT_PREDICTION_POINTS = 10;

    modifier onlyOwner() {
        require(msg.sender == owner, "PredictionMarket: not owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner == address(0) ? msg.sender : _owner;
    }

    /// @notice Registers a new fixture. Called by the WorldCupIQ backend oracle when fixtures sync.
    function createMatch(
        bytes32 matchId,
        string calldata homeTeam,
        string calldata awayTeam,
        uint64 kickoffTimestamp
    ) external onlyOwner {
        require(matches[matchId].kickoffTimestamp == 0, "PredictionMarket: match exists");

        matches[matchId] = Match({
            matchId: matchId,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            kickoffTimestamp: kickoffTimestamp,
            resolved: false,
            result: Outcome.UNSET
        });

        emit MatchCreated(matchId, homeTeam, awayTeam, kickoffTimestamp);
    }

    /// @notice Fans (or AI agents acting on their behalf) submit a prediction before kickoff.
    function submitPrediction(bytes32 matchId, Outcome pick) external {
        Match storage m = matches[matchId];
        require(m.kickoffTimestamp != 0, "PredictionMarket: unknown match");
        require(block.timestamp < m.kickoffTimestamp, "PredictionMarket: kickoff has passed");
        require(pick != Outcome.UNSET, "PredictionMarket: invalid pick");
        require(predictions[matchId][msg.sender].submittedAt == 0, "PredictionMarket: already predicted");

        predictions[matchId][msg.sender] =
            Prediction({predictor: msg.sender, pick: pick, submittedAt: uint64(block.timestamp), scored: false});

        _predictorsByMatch[matchId].push(msg.sender);

        emit PredictionSubmitted(matchId, msg.sender, pick);
    }

    /// @notice Called by the trusted oracle once a real-world result is final.
    function resolveMatch(bytes32 matchId, Outcome result) external onlyOwner {
        Match storage m = matches[matchId];
        require(m.kickoffTimestamp != 0, "PredictionMarket: unknown match");
        require(!m.resolved, "PredictionMarket: already resolved");
        require(result != Outcome.UNSET, "PredictionMarket: invalid result");

        m.resolved = true;
        m.result = result;

        emit MatchResolved(matchId, result);
    }

    /// @notice Awards points to a single predictor once a match is resolved. Can be called by anyone
    ///         (e.g. an AI agent claiming its own points) since scoring logic is fully deterministic.
    function scorePredictor(bytes32 matchId, address predictor) external {
        Match storage m = matches[matchId];
        require(m.resolved, "PredictionMarket: not resolved");

        Prediction storage p = predictions[matchId][predictor];
        require(p.submittedAt != 0, "PredictionMarket: no prediction");
        require(!p.scored, "PredictionMarket: already scored");

        p.scored = true;

        if (p.pick == m.result) {
            leaderboard[predictor] += CORRECT_PREDICTION_POINTS;
            emit PointsAwarded(matchId, predictor, CORRECT_PREDICTION_POINTS);
        }
    }

    function getLeaderboardScore(address predictor) external view returns (uint256) {
        return leaderboard[predictor];
    }

    function getPredictorsForMatch(bytes32 matchId) external view returns (address[] memory) {
        return _predictorsByMatch[matchId];
    }
}
