// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {IPredictionMarket} from "../src/interfaces/IPredictionMarket.sol";

contract PredictionMarketTest is Test {
    PredictionMarket market;
    address owner = address(0xA11CE);
    address fan = address(0xFA17);
    bytes32 matchId = keccak256("BRA-vs-ARG-2026-final");

    function setUp() public {
        vm.prank(owner);
        market = new PredictionMarket(owner);
    }

    function test_createMatch() public {
        vm.prank(owner);
        market.createMatch(matchId, "Brazil", "Argentina", uint64(block.timestamp + 1 days));

        (,,, uint64 kickoff, bool resolved,) = market.matches(matchId);
        assertEq(kickoff, uint64(block.timestamp + 1 days));
        assertFalse(resolved);
    }

    function test_submitPredictionBeforeKickoff() public {
        vm.prank(owner);
        market.createMatch(matchId, "Brazil", "Argentina", uint64(block.timestamp + 1 days));

        vm.prank(fan);
        market.submitPrediction(matchId, IPredictionMarket.Outcome.HOME_WIN);

        (address predictor, IPredictionMarket.Outcome pick,,) = market.predictions(matchId, fan);
        assertEq(predictor, fan);
        assertEq(uint8(pick), uint8(IPredictionMarket.Outcome.HOME_WIN));
    }

    function test_revertsOnPredictionAfterKickoff() public {
        vm.prank(owner);
        market.createMatch(matchId, "Brazil", "Argentina", uint64(block.timestamp + 1 hours));

        vm.warp(block.timestamp + 2 hours);

        vm.prank(fan);
        vm.expectRevert("PredictionMarket: kickoff has passed");
        market.submitPrediction(matchId, IPredictionMarket.Outcome.HOME_WIN);
    }

    function test_correctPredictionAwardsPoints() public {
        vm.prank(owner);
        market.createMatch(matchId, "Brazil", "Argentina", uint64(block.timestamp + 1 hours));

        vm.prank(fan);
        market.submitPrediction(matchId, IPredictionMarket.Outcome.HOME_WIN);

        vm.warp(block.timestamp + 2 hours);
        vm.prank(owner);
        market.resolveMatch(matchId, IPredictionMarket.Outcome.HOME_WIN);

        market.scorePredictor(matchId, fan);

        assertEq(market.getLeaderboardScore(fan), market.CORRECT_PREDICTION_POINTS());
    }

    function test_incorrectPredictionAwardsNoPoints() public {
        vm.prank(owner);
        market.createMatch(matchId, "Brazil", "Argentina", uint64(block.timestamp + 1 hours));

        vm.prank(fan);
        market.submitPrediction(matchId, IPredictionMarket.Outcome.AWAY_WIN);

        vm.warp(block.timestamp + 2 hours);
        vm.prank(owner);
        market.resolveMatch(matchId, IPredictionMarket.Outcome.HOME_WIN);

        market.scorePredictor(matchId, fan);

        assertEq(market.getLeaderboardScore(fan), 0);
    }
}
