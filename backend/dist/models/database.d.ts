import { Pool } from 'pg';
export declare const pool: Pool;
export declare function query(text: string, params?: any[]): Promise<import("pg").QueryResult<any>>;
export declare function getClient(): Promise<import("pg").PoolClient>;
//# sourceMappingURL=database.d.ts.map