import {statusAssetPack,exportAssetPack} from '../src/story-planner/asset-pack.js';
await statusAssetPack(process.argv[2]!,process.argv[3]!);
await exportAssetPack(process.argv[2]!,process.argv[3]!,process.argv[4]!,new AbortController().signal);
