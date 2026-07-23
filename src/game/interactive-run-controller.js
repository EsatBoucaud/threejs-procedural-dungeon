import { actorForAssignment } from './activity-authority.js';
import { assignmentsForPlayer } from './deployment-system.js';
import { RunController } from './run-controller.js';
import { SharedInteractionSystem } from './shared-interaction-system.js';

export class InteractiveRunController extends RunController {
  constructor(renderer, mapState, events = {}) {
    super(renderer, mapState, events);
    this.sharedInteractions = new SharedInteractionSystem(
      this.mission.activityAuthority,
      mapState.deployment,
      mapState.seedLabel,
      {
        onUpdate: (snapshot) => this.events.onSharedInteraction?.(snapshot),
        onObjectResolved: ({ session, option, actor, resolution }) => {
          const result = this.mission.resolveObjectDecision(session.payload.lootId, option.id, actor);
          if (!result.success) this.events.onFeed?.(`Object decision failed: ${result.reason}.`, 'danger');
          if (resolution?.rolls) this.reportDecisionRoll(resolution);
        },
        onDialogueResolved: ({ session, choice, actor, resolution }) => {
          this.mission.resolveDialogue(session.payload.nodeId, choice, actor);
          if (choice.effect === 'reduce-threat') this.director.threat = Math.max(0, this.director.threat - 0.16);
          if (choice.effect === 'bridge-risk') this.director.threat = Math.min(1, this.director.threat + 0.14);
          if (choice.effect === 'protect-object') this.player.damageResistance = Math.max(this.player.damageResistance, 5);
          if (resolution?.rolls) this.reportDecisionRoll(resolution);
        },
        onCardBattleResolved: ({ session, won }) => {
          this.mission.resolveCardBattle(session.payload.node.nodeId, won, session.participants);
          this.director.threat = Math.max(0, Math.min(1, this.director.threat + (won ? -0.2 : 0.18)));
        },
        onExtractionApproved: (session) => {
          if (session.proposal?.resolution?.rolls) this.reportDecisionRoll(session.proposal.resolution);
          super.attemptExtraction();
        },
      },
    );
    this.events.onSharedInteraction?.(this.sharedInteractions.snapshot());
  }

  reportDecisionRoll(resolution) {
    if (!resolution?.rolls) return;
    const agree = resolution.rolls.agree;
    const oppose = resolution.rolls.oppose;
    this.events.onFeed?.(
      `Decision roll — agree ${agree.die}+${agree.modifier}=${agree.total}; oppose ${oppose.die}+${oppose.modifier}=${oppose.total}.`,
      resolution.passed ? 'good' : 'danger',
    );
  }

  actorForPlayer(playerId) {
    const deployment = this.mapState.deployment;
    if (playerId === deployment?.localPlayerId) return this.activeActor;
    const assignment = assignmentsForPlayer(deployment, playerId)[0];
    return assignment ? actorForAssignment(assignment) : null;
  }

  isSharedInteractionOpen() {
    return Boolean(this.sharedInteractions.activeSession);
  }

  interact() {
    if (this.finished || this.isSharedInteractionOpen()) return;
    const interaction = this.mission.interact(this.player.position, this.activeActor);
    if (interaction.kind === 'object') {
      this.sharedInteractions.openObjectDecision(this.activeActor, interaction.loot);
      return;
    }
    if (interaction.kind === 'dialogue') {
      this.sharedInteractions.openDialogue(this.activeActor, interaction.node);
      return;
    }
    if (interaction.kind === 'card-battle') {
      this.sharedInteractions.openCardBattle(this.activeActor, interaction.node);
      return;
    }
    if (interaction.kind === 'extraction') {
      if (!this.director.canExtract()) {
        this.events.onFeed?.(`${this.majorProcess.name} is holding the return passage closed.`, 'danger');
        return;
      }
      this.sharedInteractions.openExtractionProposal(this.activeActor, {
        id: 'passage:extraction',
        roomId: interaction.entrance.id,
      });
    }
  }

  handleSharedInteractionAction(action) {
    const sessionId = action.sessionId;
    const actor = this.actorForPlayer(action.playerId);
    if (!sessionId || !actor) return { success: false, reason: 'missing-player-or-session' };

    if (action.type === 'close') return this.sharedInteractions.close(sessionId, action.playerId);
    if (action.type === 'join') return this.sharedInteractions.join(sessionId, actor);
    if (action.type === 'handoff-request') {
      return this.sharedInteractions.requestHandoff(sessionId, action.playerId, action.toPlayerId);
    }
    if (action.type === 'handoff-accept') return this.sharedInteractions.acceptHandoff(sessionId, action.playerId);
    if (action.type === 'dialogue-choice') {
      return this.sharedInteractions.chooseDialogue(sessionId, actor, action.choiceId);
    }
    if (action.type === 'object-choice') {
      return this.sharedInteractions.chooseObjectOption(sessionId, actor, action.optionId);
    }
    if (action.type === 'vote') return this.sharedInteractions.castVote(sessionId, action.playerId, action.response);
    if (action.type === 'play-card') return this.sharedInteractions.playCard(sessionId, action.playerId, action.cardId);
    return { success: false, reason: 'unknown-shared-action' };
  }
}
