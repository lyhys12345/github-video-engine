import {DatabaseSync} from 'node:sqlite';
import {EngineError} from '../core/errors.js';
import {canonical} from '../core/util.js';
export const PRODUCTION_DB_VERSION=1;
export const PRODUCTION_SCHEMA_SQL=`
CREATE TABLE IF NOT EXISTS packages(hash TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS selected(project_id TEXT PRIMARY KEY,hash TEXT NOT NULL REFERENCES packages(hash));
CREATE TABLE IF NOT EXISTS production_approvals(project_id TEXT,package_hash TEXT,gate TEXT,data TEXT,PRIMARY KEY(project_id,package_hash,gate));
CREATE TRIGGER IF NOT EXISTS package_no_update BEFORE UPDATE ON packages BEGIN SELECT RAISE(ABORT,'Packages are immutable');END;
CREATE TRIGGER IF NOT EXISTS package_no_delete BEFORE DELETE ON packages BEGIN SELECT RAISE(ABORT,'Packages are immutable');END;
CREATE TRIGGER IF NOT EXISTS pa_no_update BEFORE UPDATE ON production_approvals BEGIN SELECT RAISE(ABORT,'Approvals are immutable');END;
CREATE TRIGGER IF NOT EXISTS pa_no_delete BEFORE DELETE ON production_approvals BEGIN SELECT RAISE(ABORT,'Approvals are immutable');END;`;
export const REPAIR_SCHEMA_SQL=`
CREATE TABLE repair_scopes(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,plan_revision TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(project_id,plan_revision));
CREATE TABLE repair_rounds(id TEXT PRIMARY KEY,scope_id TEXT NOT NULL REFERENCES repair_scopes(id),request_id TEXT NOT NULL,round INTEGER NOT NULL CHECK(round>0),data TEXT NOT NULL,UNIQUE(scope_id,request_id),UNIQUE(scope_id,round));
CREATE TRIGGER repair_scope_no_update BEFORE UPDATE ON repair_scopes BEGIN SELECT RAISE(ABORT,'Repair scopes are immutable');END;
CREATE TRIGGER repair_scope_no_delete BEFORE DELETE ON repair_scopes BEGIN SELECT RAISE(ABORT,'Repair scopes are immutable');END;
CREATE TRIGGER repair_round_no_update BEFORE UPDATE ON repair_rounds BEGIN SELECT RAISE(ABORT,'Repair rounds are immutable');END;
CREATE TRIGGER repair_round_no_delete BEFORE DELETE ON repair_rounds BEGIN SELECT RAISE(ABORT,'Repair rounds are immutable');END;`;
export function validateProductionSchema(db:DatabaseSync,version:0|1,allowEmpty=false){
 const read=(d:DatabaseSync)=>d.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all().map(r=>({type:r.type,name:r.name,sql:String(r.sql).replace(/\s+/g,'').replace(/ifnotexists/ig,'').toLowerCase()}));
 const actual=read(db);if(version===0&&allowEmpty&&!actual.length)return;
 const reference=new DatabaseSync(':memory:');try{reference.exec(PRODUCTION_SCHEMA_SQL+(version===1?REPAIR_SCHEMA_SQL:''));if(canonical(actual)!==canonical(read(reference)))throw new EngineError('PRODUCTION_DB_SCHEMA','Unknown production schema, constraints or history-preservation guards');}finally{reference.close();}
}
export function migrateProduction(db:DatabaseSync){
 const initial=Number(db.prepare('PRAGMA user_version').get()!.user_version);if(![0,1].includes(initial))throw new EngineError('PRODUCTION_DB_VERSION','Unsupported production database version '+initial);
 db.exec('PRAGMA busy_timeout=5000;PRAGMA foreign_keys=ON;BEGIN IMMEDIATE');try{const version=Number(db.prepare('PRAGMA user_version').get()!.user_version);if(version===0){validateProductionSchema(db,0,true);db.exec(PRODUCTION_SCHEMA_SQL+REPAIR_SCHEMA_SQL+'PRAGMA user_version=1;');}else if(version!==1)throw new EngineError('PRODUCTION_DB_VERSION','Unsupported production database version '+version);validateProductionSchema(db,1);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 db.exec('PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL');
}
