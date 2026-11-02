import {writeFile} from 'node:fs/promises';
import {z} from 'zod';
import {StorySchema} from '../contracts/story.js';
await writeFile('schemas/story-v1.schema.json',JSON.stringify(z.toJSONSchema(StorySchema),null,2)+'\n');
