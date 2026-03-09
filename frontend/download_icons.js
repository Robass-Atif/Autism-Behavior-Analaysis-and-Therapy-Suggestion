import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICONS_DIR = path.join(__dirname, 'src', 'assets', 'icons');

const iconsToDownload = {
    'arm_swing_left': 'noto:mechanical-arm',
    'arm_swing_right': 'noto:flexed-biceps',
    'body_swing': 'noto:person-standing', 
    'chest_expansion': 'noto:lungs',
    'sing_and_clap': 'noto:clapping-hands',
    'drumming': 'noto:drum',
    'frog_pose': 'noto:frog',
    'maracas_shaking': 'noto:musical-notes',
    'maracas_forward': 'noto:maracas',
    'squat': 'noto:person-lifting-weights',
    'tree_pose': 'noto:deciduous-tree',
    'twist_pose': 'noto:cyclone',
    'arm_rotation': 'noto:dizzy',
    'head_tilt': 'noto:person-bowing',
    'finger_tapping': 'noto:index-pointing-up',
    'jump_test': 'noto:person-bouncing-ball'
};

const downloadIcon = (actionId, iconifyName) => {
    return new Promise((resolve) => {
        const [prefix, name] = iconifyName.split(':');
        const url = `https://api.iconify.design/${prefix}/${name}.svg`;
        
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                console.error(`Failed to download ${url}: ${res.statusCode}`);
                res.resume();
                resolve(false);
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const filePath = path.join(ICONS_DIR, `${actionId}.svg`);
                fs.writeFileSync(filePath, data);
                console.log(`Downloaded ${actionId}.svg`);
                resolve(true);
            });
        }).on('error', (err) => {
            console.error(`Error downloading ${url}:`, err.message);
            resolve(false);
        });
    });
};

async function main() {
    if (!fs.existsSync(ICONS_DIR)){
        fs.mkdirSync(ICONS_DIR, { recursive: true });
    }
    console.log("Downloading icons...");
    for (const [actionId, iconifyName] of Object.entries(iconsToDownload)) {
        await downloadIcon(actionId, iconifyName);
    }
    console.log("Done.");
}

main();
