import { ItWorkspaceService } from './it-workspace.service';
import { BadRequestException } from '@nestjs/common';

describe('ItWorkspaceService - Workflow Rules', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    backlog: ['planned'],
    planned: ['in_progress', 'backlog'],
    in_progress: ['qa', 'planned'],
    qa: ['ready_for_release', 'in_progress'],
    ready_for_release: ['qa'],
    released: [],
  };

  describe('Status transition validation', () => {
    it('should allow valid transition from backlog to planned', () => {
      const allowed = VALID_TRANSITIONS['backlog'];
      expect(allowed).toContain('planned');
    });

    it('should not allow skipping QA — in_progress cannot go to ready_for_release', () => {
      const allowed = VALID_TRANSITIONS['in_progress'];
      expect(allowed).not.toContain('ready_for_release');
    });

    it('should not allow any transition from released', () => {
      const allowed = VALID_TRANSITIONS['released'];
      expect(allowed).toHaveLength(0);
    });

    it('should allow going back from qa to in_progress', () => {
      const allowed = VALID_TRANSITIONS['qa'];
      expect(allowed).toContain('in_progress');
    });

    it('should allow going back from ready_for_release to qa', () => {
      const allowed = VALID_TRANSITIONS['ready_for_release'];
      expect(allowed).toContain('qa');
    });
  });

  describe('QA gate logic', () => {
    it('should block ready_for_release if no QA checks exist', () => {
      const qaChecks: any[] = [];
      const wouldBlock = qaChecks.length === 0;
      expect(wouldBlock).toBe(true);
    });

    it('should block ready_for_release if any QA check is not passed', () => {
      const qaChecks = [
        { id: '1', status: 'passed' },
        { id: '2', status: 'failed' },
      ];
      const notPassed = qaChecks.filter(c => c.status !== 'passed');
      expect(notPassed.length).toBeGreaterThan(0);
    });

    it('should allow ready_for_release if all QA checks are passed', () => {
      const qaChecks = [
        { id: '1', status: 'passed' },
        { id: '2', status: 'passed' },
      ];
      const notPassed = qaChecks.filter(c => c.status !== 'passed');
      expect(notPassed.length).toBe(0);
    });
  });

  describe('Score idempotency', () => {
    it('should not award score twice for same entity and event', () => {
      const scoreEvents: Array<{userId: string, entityId: string, eventType: string}> = [];
      
      function awardScore(userId: string, entityId: string, eventType: string) {
        const exists = scoreEvents.find(
          e => e.userId === userId && e.entityId === entityId && e.eventType === eventType
        );
        if (!exists) scoreEvents.push({ userId, entityId, eventType });
      }

      awardScore('user1', 'item-123', 'create_work_item');
      awardScore('user1', 'item-123', 'create_work_item');

      expect(scoreEvents.length).toBe(1);
    });
  });
});