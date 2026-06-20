import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'spoton_challenge',
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  backlog: ['planned'],
  planned: ['in_progress', 'backlog'],
  in_progress: ['qa', 'planned'],
  qa: ['ready_for_release', 'in_progress'],
  ready_for_release: ['qa'],
  released: [],
};

@Injectable()
export class ItWorkspaceService {

  private async awardScore(userId: string, entityId: string, eventType: string, points: number) {
    try {
      await pool.query(
        `INSERT INTO score_events (user_id, entity_id, event_type, points)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, entity_id, event_type) DO NOTHING`,
        [userId, entityId, eventType, points]
      );
    } catch (e) {
      console.error('Score event error:', e);
    }
  }

  async listWorkItems(filters: any = {}) {
    let query = `SELECT * FROM work_items WHERE 1=1`;
    const params: any[] = [];
    let i = 1;
    if (filters.status) { query += ` AND status = $${i++}`; params.push(filters.status); }
    if (filters.priority) { query += ` AND priority = $${i++}`; params.push(filters.priority); }
    if (filters.assignee) { query += ` AND assignee = $${i++}`; params.push(filters.assignee); }
    if (filters.search) { query += ` AND title ILIKE $${i++}`; params.push(`%${filters.search}%`); }
    if (filters.my_work) { query += ` AND created_by = $${i++}`; params.push(filters.my_work); }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  }

  async getWorkItem(id: string) {
    const result = await pool.query(`SELECT * FROM work_items WHERE id = $1`, [id]);
    if (!result.rows[0]) throw new NotFoundException('Work item not found');
    return result.rows[0];
  }

  async createWorkItem(body: any, user: any) {
    const { title, description, type, priority, assignee, due_date } = body;
    if (!title) throw new BadRequestException('Title is required');
    const result = await pool.query(
      `INSERT INTO work_items (title, description, type, status, priority, assignee, due_date, created_by)
       VALUES ($1,$2,$3,'backlog',$4,$5,$6,$7) RETURNING *`,
      [title, description, type || 'feature', priority || 'medium', assignee, due_date || null, user.email]
    );
    await this.awardScore(user.email, result.rows[0].id, 'Work Item Created', 1);
    return result.rows[0];
  }

  async updateWorkItem(id: string, body: any) {
    const existing = await this.getWorkItem(id);
    if (body.status && body.status !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(body.status)) {
        throw new BadRequestException(
          `Cannot move from "${existing.status}" to "${body.status}". Allowed: ${allowed.join(', ') || 'none'}`
        );
      }
      if (body.status === 'ready_for_release') {
        const qa = await pool.query(`SELECT * FROM qa_checks WHERE work_item_id = $1`, [id]);
        if (qa.rows.length === 0) throw new BadRequestException('Cannot mark ready: no QA checks exist');
        const notPassed = qa.rows.filter(r => r.status !== 'passed');
        if (notPassed.length > 0) throw new BadRequestException('Cannot mark ready: all QA checks must be passed');
      }
    }
    const result = await pool.query(
      `UPDATE work_items SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        type = COALESCE($3, type),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        assignee = COALESCE($6, assignee),
        due_date = COALESCE($7, due_date),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [body.title, body.description, body.type, body.status, body.priority, body.assignee, body.due_date, id]
    );
    if (body.status === 'qa') {
      await this.awardScore('system', id, 'Moved to QA', 1);
    }
    if (body.status === 'ready_for_release') {
      await this.awardScore('system', id, 'Ready for Release', 2);
    }
    return result.rows[0];
  }

  async deleteWorkItem(id: string) {
    await this.getWorkItem(id);
    await pool.query(`DELETE FROM work_items WHERE id = $1`, [id]);
    return { message: 'Deleted successfully' };
  }

  async listQaChecks(workItemId: string) {
    const result = await pool.query(
      `SELECT * FROM qa_checks WHERE work_item_id = $1 ORDER BY created_at ASC`, [workItemId]
    );
    return result.rows;
  }

  async createQaCheck(workItemId: string, body: any) {
    await this.getWorkItem(workItemId);
    const { test_title, expected_result, actual_result, tester, notes } = body;
    if (!test_title) throw new BadRequestException('test_title is required');
    const result = await pool.query(
      `INSERT INTO qa_checks (work_item_id, test_title, expected_result, actual_result, status, tester, notes)
       VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING *`,
      [workItemId, test_title, expected_result, actual_result, tester, notes]
    );
    return result.rows[0];
  }

  async updateQaCheck(workItemId: string, checkId: string, body: any) {
    const result = await pool.query(
      `UPDATE qa_checks SET
        status = COALESCE($1, status),
        actual_result = COALESCE($2, actual_result),
        notes = COALESCE($3, notes),
        updated_at = NOW()
       WHERE id = $4 AND work_item_id = $5 RETURNING *`,
      [body.status, body.actual_result, body.notes, checkId, workItemId]
    );
    if (!result.rows[0]) throw new NotFoundException('QA check not found');
    if (body.status === 'passed') {
      await this.awardScore('system', checkId, 'QA Check Passed', 1);
    }
    return result.rows[0];
  }

  async listReleases() {
    const releases = await pool.query(`SELECT * FROM releases ORDER BY created_at DESC`);
    for (const r of releases.rows) {
      const items = await pool.query(
        `SELECT w.* FROM work_items w
         JOIN release_work_items rw ON rw.work_item_id = w.id
         WHERE rw.release_id = $1`, [r.id]
      );
      r.work_items = items.rows;
    }
    return releases.rows;
  }

  async createRelease(body: any) {
    const { version, release_date, summary } = body;
    if (!version) throw new BadRequestException('version is required');
    const result = await pool.query(
      `INSERT INTO releases (version, release_date, summary, deployment_status)
       VALUES ($1,$2,$3,'draft') RETURNING *`,
      [version, release_date || null, summary]
    );
    return result.rows[0];
  }

  async linkWorkItemToRelease(releaseId: string, workItemId: string) {
    const item = await this.getWorkItem(workItemId);
    if (item.status !== 'ready_for_release') {
      throw new BadRequestException('Only ready_for_release items can be linked to a release');
    }
    await pool.query(
      `INSERT INTO release_work_items (release_id, work_item_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [releaseId, workItemId]
    );
    return { message: 'Linked successfully' };
  }

  async deployRelease(releaseId: string) {
    const release = await pool.query(`SELECT * FROM releases WHERE id = $1`, [releaseId]);
    if (!release.rows[0]) throw new NotFoundException('Release not found');
    if (release.rows[0].deployment_status === 'deployed') {
      throw new BadRequestException('Release already deployed');
    }
    await pool.query(
      `UPDATE releases SET deployment_status = 'deployed', updated_at = NOW() WHERE id = $1`, [releaseId]
    );
    await pool.query(
      `UPDATE work_items SET status = 'released', updated_at = NOW()
       WHERE id IN (SELECT work_item_id FROM release_work_items WHERE release_id = $1)`, [releaseId]
    );
    await this.awardScore('system', releaseId, 'Release Deployed', 3);
    return { message: 'Release deployed successfully' };
  }

  summary() {
    return { message: 'IT Workspace API' };
  }
}