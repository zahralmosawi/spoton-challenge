import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { RequestUser } from '../common/request-user';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'spoton_challenge',
});

export type ScoreEvent = {
  id: string;
  userId: string;
  action: string;
  points: number;
  createdAt: string;
};

@Injectable()
export class ScoreService {
  async summaryFor(user: RequestUser) {
    const result = await pool.query(
      `SELECT * FROM score_events WHERE user_id = $1 OR user_id = 'system' ORDER BY created_at DESC`,
      [user.email]
    );
    const events = result.rows;
    return {
      total: events.reduce((sum: number, e: any) => sum + e.points, 0),
      events: events.map((e: any) => ({
        id: e.id,
        action: e.event_type,
        points: e.points,
        createdAt: e.created_at,
      })),
    };
  }

  award(user: RequestUser, action: string, points: number) {
    return { id: 'legacy', userId: user.id, action, points, createdAt: new Date().toISOString() };
  }
}