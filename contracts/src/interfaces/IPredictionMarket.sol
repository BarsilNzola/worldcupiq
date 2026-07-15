// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPredictionMarket {
    enum Outcome {
        UNSET,
        HOME_WIN,
        AWAY_WIN,
        DRAW
    }

    struct Match {
        bytes32 matchId;
        string homeTeam;
        string awayTeam;
        uint64 kickoffTimestamp;
        bool resolved;
        Outcome result;
    }

    struct Prediction {
        address predictor;
        Outcome pick;
        uint64 submittedAt;
        bool scored;
    }

    event MatchCreated(bytes32 indexed matchId, string homeTeam, string awayTeam, uint64 kickoffTimestamp);
    event MatchResolved(bytes32 indexed matchId, Outcome result);
    event PredictionSubmitted(bytes32 indexed matchId, address indexed predictor, Outcome pick);
    event PointsAwarded(bytes32 indexed matchId, address indexed predictor, uint256 points);

    function createMatch(bytes32 matchId, string calldata homeTeam, string calldata awayTeam, uint64 kickoffTimestamp)
        external;

    function submitPrediction(bytes32 matchId, Outcome pick) external;

    function resolveMatch(bytes32 matchId, Outcome result) external;

    function scorePredictor(bytes32 matchId, address predictor) external;

    function getLeaderboardScore(address predictor) external view returns (uint256);
}
