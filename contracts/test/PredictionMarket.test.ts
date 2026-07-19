import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { PredictionMarket } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const Outcome = {
  UNSET: 0,
  HOME_WIN: 1,
  AWAY_WIN: 2,
  DRAW: 3,
} as const;

describe("PredictionMarket", () => {
  let market: PredictionMarket;
  let owner: HardhatEthersSigner;
  let fan: HardhatEthersSigner;
  const matchId = ethers.keccak256(ethers.toUtf8Bytes("BRA-vs-ARG-2026-final"));

  beforeEach(async () => {
    [owner, fan] = await ethers.getSigners();
    const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarket");
    market = (await PredictionMarketFactory.deploy(owner.address)) as unknown as PredictionMarket;
    await market.waitForDeployment();
  });

  it("creates a match permissionlessly (no owner required)", async () => {
    const kickoff = (await time.latest()) + 86400;
    await market.connect(fan).createMatch(matchId, "Brazil", "Argentina", kickoff);

    const stored = await market.matches(matchId);
    expect(stored.kickoffTimestamp).to.equal(BigInt(kickoff));
    expect(stored.resolved).to.equal(false);
  });

  it("auto-registers the match on a fan's first prediction, no createMatch call needed", async () => {
    const kickoff = (await time.latest()) + 86400;

    await market.connect(fan).submitPrediction(matchId, "Brazil", "Argentina", kickoff, Outcome.HOME_WIN);

    const stored = await market.matches(matchId);
    expect(stored.homeTeam).to.equal("Brazil");
    expect(stored.kickoffTimestamp).to.equal(BigInt(kickoff));

    const prediction = await market.predictions(matchId, fan.address);
    expect(prediction.predictor).to.equal(fan.address);
    expect(prediction.pick).to.equal(Outcome.HOME_WIN);
  });

  it("reverts a prediction submitted after kickoff", async () => {
    const kickoff = (await time.latest()) + 3600;
    await time.increase(7200);

    await expect(
      market.connect(fan).submitPrediction(matchId, "Brazil", "Argentina", kickoff, Outcome.HOME_WIN)
    ).to.be.revertedWith("PredictionMarket: kickoff has passed");
  });

  it("awards points for a correct prediction", async () => {
    const kickoff = (await time.latest()) + 3600;
    await market.connect(fan).submitPrediction(matchId, "Brazil", "Argentina", kickoff, Outcome.HOME_WIN);

    await time.increase(7200);
    await market.connect(owner).resolveMatch(matchId, Outcome.HOME_WIN);
    await market.scorePredictor(matchId, fan.address);

    const points = await market.CORRECT_PREDICTION_POINTS();
    expect(await market.getLeaderboardScore(fan.address)).to.equal(points);
  });

  it("awards no points for an incorrect prediction", async () => {
    const kickoff = (await time.latest()) + 3600;
    await market.connect(fan).submitPrediction(matchId, "Brazil", "Argentina", kickoff, Outcome.AWAY_WIN);

    await time.increase(7200);
    await market.connect(owner).resolveMatch(matchId, Outcome.HOME_WIN);
    await market.scorePredictor(matchId, fan.address);

    expect(await market.getLeaderboardScore(fan.address)).to.equal(0n);
  });
});
