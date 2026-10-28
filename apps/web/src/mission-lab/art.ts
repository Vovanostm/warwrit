import faddeiScene01 from '../../../../assets/art/quests/faddei/scene-01.png';
import faddeiScene02 from '../../../../assets/art/quests/faddei/scene-02.png';
import faddeiScene03 from '../../../../assets/art/quests/faddei/scene-03.png';
import faddeiScene04 from '../../../../assets/art/quests/faddei/scene-04.png';
import faddeiScene05 from '../../../../assets/art/quests/faddei/scene-05.png';
import faddeiScene06 from '../../../../assets/art/quests/faddei/scene-06.png';
import faddeiScene07 from '../../../../assets/art/quests/faddei/scene-07.png';
import faddeiScene08 from '../../../../assets/art/quests/faddei/scene-08.png';
import faddeiScene09 from '../../../../assets/art/quests/faddei/scene-09.png';
import faddeiEndingBoth from '../../../../assets/art/quests/faddei/ending-both.png';
import faddeiEndingMoney from '../../../../assets/art/quests/faddei/ending-money.png';
import faddeiEndingBody from '../../../../assets/art/quests/faddei/ending-body.png';
import wellStart from '../../../../assets/art/quests/well/start.png';
import wellDepth from '../../../../assets/art/quests/well/depth.png';
import wellAnchor from '../../../../assets/art/quests/well/anchor.png';
import wellDecision from '../../../../assets/art/quests/well/decision.png';
import wellNow from '../../../../assets/art/quests/well/now.png';
import wellWait from '../../../../assets/art/quests/well/wait.png';
import wellRefuse from '../../../../assets/art/quests/well/refuse.png';
import harvestStart from '../../../../assets/art/quests/harvest/start.png';
import harvestWitness from '../../../../assets/art/quests/harvest/witness.png';
import harvestEdge from '../../../../assets/art/quests/harvest/edge.png';
import harvestTrial from '../../../../assets/art/quests/harvest/trial.png';
import harvestTerms from '../../../../assets/art/quests/harvest/terms.png';
import harvestLeave from '../../../../assets/art/quests/harvest/leave.png';
import harvestEdgeHarvest from '../../../../assets/art/quests/harvest/edgeHarvest.png';
import harvestSharedHarvest from '../../../../assets/art/quests/harvest/sharedHarvest.png';
import swampStart from '../../../../assets/art/quests/swamp/start.png';
import swampCauseway from '../../../../assets/art/quests/swamp/causeway.png';
import swampIsland from '../../../../assets/art/quests/swamp/island.png';
import swampRescued from '../../../../assets/art/quests/swamp/rescued.png';
import swampFight from '../../../../assets/art/quests/swamp/fight.png';
import swampRetreat from '../../../../assets/art/quests/swamp/retreat.png';
import banditsStart from '../../../../assets/art/quests/bandits/start.png';
import banditsTracks from '../../../../assets/art/quests/bandits/tracks.png';
import banditsWatch from '../../../../assets/art/quests/bandits/watch.png';
import banditsSentry from '../../../../assets/art/quests/bandits/sentry.png';
import banditsNight from '../../../../assets/art/quests/bandits/night.png';
import banditsAssault from '../../../../assets/art/quests/bandits/assault.png';
import banditsWithdraw from '../../../../assets/art/quests/bandits/withdraw.png';
import hydraStart from '../../../../assets/art/quests/hydra/start.png';
import hydraRuins from '../../../../assets/art/quests/hydra/ruins.png';
import hydraLair from '../../../../assets/art/quests/hydra/lair.png';
import hydraSealed from '../../../../assets/art/quests/hydra/sealed.png';
import hydraSlain from '../../../../assets/art/quests/hydra/slain.png';
import hydraRetreat from '../../../../assets/art/quests/hydra/retreat.png';

export const paintings = {
  'faddei-start': faddeiScene01,
  'faddei-s2': faddeiScene02,
  'faddei-s3': faddeiScene03,
  'faddei-s4': faddeiScene04,
  'faddei-s5': faddeiScene05,
  'faddei-s6': faddeiScene06,
  'faddei-s7': faddeiScene07,
  'faddei-s8': faddeiScene08,
  'faddei-s9': faddeiScene09,
  'faddei-end1': faddeiEndingBoth,
  'faddei-end2': faddeiEndingMoney,
  'faddei-end3': faddeiEndingBody,
  'well-start': wellStart,
  'well-depth': wellDepth,
  'well-anchor': wellAnchor,
  'well-decision': wellDecision,
  'well-now': wellNow,
  'well-wait': wellWait,
  'well-refuse': wellRefuse,
  'harvest-start': harvestStart,
  'harvest-witness': harvestWitness,
  'harvest-edge': harvestEdge,
  'harvest-trial': harvestTrial,
  'harvest-terms': harvestTerms,
  'harvest-leave': harvestLeave,
  'harvest-edgeHarvest': harvestEdgeHarvest,
  'harvest-sharedHarvest': harvestSharedHarvest,

  'swamp-start': swampStart,
  'swamp-causeway': swampCauseway,
  'swamp-island': swampIsland,
  'swamp-rescued': swampRescued,
  'swamp-fight': swampFight,
  'swamp-retreat': swampRetreat,
  'bandits-start': banditsStart,
  'bandits-tracks': banditsTracks,
  'bandits-watch': banditsWatch,
  'bandits-sentry': banditsSentry,
  'bandits-night': banditsNight,
  'bandits-assault': banditsAssault,
  'bandits-withdraw': banditsWithdraw,
  'hydra-start': hydraStart,
  'hydra-ruins': hydraRuins,
  'hydra-lair': hydraLair,
  'hydra-sealed': hydraSealed,
  'hydra-slain': hydraSlain,
  'hydra-retreat': hydraRetreat,
} as const;

export type MissionArtId = keyof typeof paintings;
