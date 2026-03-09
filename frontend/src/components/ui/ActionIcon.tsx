import React from 'react';

import arm_swing_left from '../../assets/icons/arm_swing_left.svg';
import arm_swing_right from '../../assets/icons/arm_swing_right.svg';
import body_swing from '../../assets/icons/body_swing.svg';
import chest_expansion from '../../assets/icons/chest_expansion.svg';
import sing_and_clap from '../../assets/icons/sing_and_clap.svg';
import drumming from '../../assets/icons/drumming.svg';
import frog_pose from '../../assets/icons/frog_pose.svg';
import maracas_shaking from '../../assets/icons/maracas_shaking.svg';
import maracas_forward from '../../assets/icons/maracas_forward.svg';
import squat from '../../assets/icons/squat.svg';
import tree_pose from '../../assets/icons/tree_pose.svg';
import twist_pose from '../../assets/icons/twist_pose.svg';
import arm_rotation from '../../assets/icons/arm_rotation.svg';
import head_tilt from '../../assets/icons/head_tilt.svg';
import finger_tapping from '../../assets/icons/finger_tapping.svg';
import jump_test from '../../assets/icons/jump_test.svg';

const ICON_MAP: Record<string, string> = {
    arm_swing_left,
    arm_swing_right,
    body_swing,
    chest_expansion,
    sing_and_clap,
    drumming,
    frog_pose,
    maracas_shaking,
    maracas_forward,
    squat,
    tree_pose,
    twist_pose,
    arm_rotation,
    head_tilt,
    finger_tapping,
    jump_test,
};

interface ActionIconProps {
    id: string;
    className?: string;
    alt?: string;
}

export function ActionIcon({ id, className = "w-8 h-8", alt }: ActionIconProps) {
    const src = ICON_MAP[id];
    if (!src) return null;
    return <img src={src} className={className} alt={alt || id} />;
}
