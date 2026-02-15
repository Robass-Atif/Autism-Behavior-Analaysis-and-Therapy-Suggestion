import torch
import torch.nn as nn
import numpy as np
from typing import Dict, List, Tuple
import matplotlib.pyplot as plt
import logging

logger = logging.getLogger(__name__)

# Joint Names Mapping (COCO format)
COCO_JOINTS = [
    "nose", "neck", "right_shoulder", "right_elbow", "right_wrist",
    "left_shoulder", "left_elbow", "left_wrist", "right_hip", "right_knee",
    "right_ankle", "left_hip", "left_knee", "left_ankle", "right_eye",
    "left_eye", "right_ear", "left_ear", "pelvis", "thorax",
    "upper_neck", "head_top", "right_big_toe", "left_big_toe"
]

class MultiTaskADOSExplainer:
    def __init__(self, model, target_scalers, demographic_scaler, fps=30, device='cpu'):
        """
        Initialize explainer for 4-task ADOS model with demographic inputs
        """
        self.model = model.to(device)
        self.device = device
        self.model.eval()
        self.target_scalers = target_scalers
        self.demographic_scaler = demographic_scaler
        self.baseline_sequence = None
        self.fps = fps
        
        self.target_names = ['Severity', 'Social Affect', 'RRB', 'Comparison Score']
    
    def compute_integrated_gradients(self, x_seq: torch.Tensor, x_demo: torch.Tensor,
                                     seq_len: torch.Tensor, task_idx: int = 0, 
                                     steps: int = 50) -> Tuple[np.ndarray, np.ndarray, float, float]:
        """
        Compute Integrated Gradients for a specific task
        Returns attributions for both sequence and demographic features
        """
        if x_seq.dim() == 2:
            x_seq = x_seq.unsqueeze(0)
        if x_demo.dim() == 1:
            x_demo = x_demo.unsqueeze(0)
        if seq_len.dim() == 0:
            seq_len = seq_len.unsqueeze(0)
        
        x_seq = x_seq.to(self.device)
        x_demo = x_demo.to(self.device)
        seq_len = seq_len.to(self.device)
        
        # Create baselines
        if self.baseline_sequence is None or self.baseline_sequence.shape != x_seq.shape:
            self.baseline_sequence = torch.zeros_like(x_seq).to(self.device)
        baseline_demo = torch.zeros_like(x_demo).to(self.device)
        
        # Task output key mapping
        task_keys = ['severity', 'social_affect', 'rrb', 'comparison']
        task_key = task_keys[task_idx]
        
        # Get predictions
        with torch.no_grad():
            baseline_out = self.model(self.baseline_sequence, baseline_demo, seq_len)
            actual_out = self.model(x_seq, x_demo, seq_len)
            
            # Handle dict output format
            if isinstance(baseline_out, dict):
                baseline_task_out = baseline_out[task_key]
                actual_task_out = actual_out[task_key]
                # For classification heads, use argmax; for regression, use the value
                if task_key in ['severity', 'comparison']:
                    baseline_pred = torch.argmax(baseline_task_out[0]).item()
                    actual_pred = torch.argmax(actual_task_out[0]).item()
                else:
                    baseline_pred = baseline_task_out[0, 0].item()
                    actual_pred = actual_task_out[0, 0].item()
            else:
                baseline_pred = baseline_out[0, task_idx].item()
                actual_pred = actual_out[0, task_idx].item()
        
        # Compute integrated gradients
        integrated_grads_seq = torch.zeros_like(x_seq)
        integrated_grads_demo = torch.zeros_like(x_demo)
        
        for step in range(steps):
            alpha = (step + 1) / steps
            interpolated_seq = self.baseline_sequence + alpha * (x_seq - self.baseline_sequence)
            interpolated_demo = baseline_demo + alpha * (x_demo - baseline_demo)
            
            interpolated_seq.requires_grad_(True)
            interpolated_demo.requires_grad_(True)
            
            output = self.model(interpolated_seq, interpolated_demo, seq_len)
            
            # Handle dict output format
            if isinstance(output, dict):
                task_output = output[task_key]
                if task_key in ['severity', 'comparison']:
                    # For classification, sum all logits for gradient
                    task_output = task_output.sum(dim=1)
                else:
                    task_output = task_output[:, 0]
            else:
                task_output = output[:, task_idx]
            
            self.model.zero_grad()
            task_output.sum().backward()
            
            integrated_grads_seq += interpolated_seq.grad
            integrated_grads_demo += interpolated_demo.grad
        
        # Average and scale
        integrated_grads_seq = integrated_grads_seq / steps
        integrated_grads_demo = integrated_grads_demo / steps
        
        attributions_seq = (x_seq - self.baseline_sequence) * integrated_grads_seq
        attributions_demo = (x_demo - baseline_demo) * integrated_grads_demo
        
        return (attributions_seq[0].cpu().detach().numpy(), 
                attributions_demo[0].cpu().detach().numpy(),
                actual_pred, baseline_pred)

    def compute_temporal_contributions(self, attributions_seq: np.ndarray, 
                                      seq_len: int, 
                                      window_size_seconds: float = 1.0) -> List[Dict]:
        """
        Analyze temporal contributions by aggregating frame attributions into time windows
        
        Args:
            attributions_seq: Frame-level attributions [num_frames, num_features]
            seq_len: Actual sequence length (excluding padding)
            window_size_seconds: Size of temporal window in seconds
            
        Returns:
            List of dictionaries with temporal segment contributions
        """
        # Only consider non-padded frames
        attributions_seq = attributions_seq[:seq_len, :]
        
        # Calculate window size in frames
        window_size_frames = int(window_size_seconds * self.fps)
        if window_size_frames < 1:
            window_size_frames = 1
        
        # Aggregate attributions per frame (sum absolute values across all features)
        frame_contributions = np.sum(np.abs(attributions_seq), axis=1)
        
        # Create temporal windows
        num_windows = int(np.ceil(seq_len / window_size_frames))
        temporal_segments = []
        
        for i in range(num_windows):
            start_frame = i * window_size_frames
            end_frame = min((i + 1) * window_size_frames, seq_len)
            
            # Time in seconds
            start_time = start_frame / self.fps
            end_time = end_frame / self.fps
            
            # Aggregate contributions for this window
            window_contribution = np.sum(frame_contributions[start_frame:end_frame])
            
            # Get mean attribution sign (positive or negative influence)
            window_raw_attribution = np.sum(attributions_seq[start_frame:end_frame, :])
            
            temporal_segments.append({
                'start_time': float(start_time),
                'end_time': float(end_time),
                'start_frame': int(start_frame),
                'end_frame': int(end_frame),
                'contribution': float(window_contribution),
                'influence_direction': 'positive' if window_raw_attribution > 0 else 'negative',
                'raw_attribution': float(window_raw_attribution)
            })
        
        # Sort by contribution magnitude
        temporal_segments = sorted(temporal_segments, 
                                  key=lambda x: abs(x['contribution']), 
                                  reverse=True)
        
        return temporal_segments

    def compute_confidence(self, x_seq: torch.Tensor, x_demo: torch.Tensor, 
                          seq_len: torch.Tensor, task_idx: int, n_samples: int = 30) -> Dict:
        """
        Compute prediction confidence using Monte Carlo Dropout
        Higher confidence means more certain prediction
        
        Returns:
            Dict with confidence score (0-100%), std_dev, and confidence_level
        """
        self.model.train()  # Enable dropout for uncertainty estimation
        predictions = []
        
        # Task output key mapping
        task_keys = ['severity', 'social_affect', 'rrb', 'comparison']
        task_key = task_keys[task_idx]
        
        with torch.no_grad():
            for _ in range(n_samples):
                out = self.model(x_seq.to(self.device), x_demo.to(self.device), seq_len.to(self.device))
                
                # Handle dict output format
                if isinstance(out, dict):
                    task_out = out[task_key]
                    if task_key in ['severity', 'comparison']:
                        # For classification, get predicted class
                        pred_scaled = torch.argmax(task_out[0]).item()
                        predictions.append(float(pred_scaled))
                    else:
                        # For regression, get the value and inverse transform
                        pred_scaled = task_out[0, 0].item()
                        if self.target_scalers[task_idx] is not None:
                            pred_original = self.target_scalers[task_idx].inverse_transform([[pred_scaled]])[0, 0]
                        else:
                            pred_original = pred_scaled
                        predictions.append(float(pred_original))
                else:
                    pred_scaled = out[0, task_idx].item()
                    if self.target_scalers[task_idx] is not None:
                        pred_original = self.target_scalers[task_idx].inverse_transform([[pred_scaled]])[0, 0]
                    else:
                        pred_original = pred_scaled
                    predictions.append(float(pred_original))
        
        self.model.eval()  # Back to eval mode
        
        predictions = np.array(predictions)
        mean_pred = np.mean(predictions)
        std_pred = np.std(predictions)
        
        # Compute confidence score (inverse of coefficient of variation)
        # Higher std = lower confidence
        if mean_pred != 0:
            cv = abs(std_pred / mean_pred)  # Coefficient of variation
            confidence = max(0, min(100, 100 * (1 - cv)))  # Convert to 0-100% scale
        else:
            confidence = 50.0  # Default for zero predictions
        
        # Determine confidence level
        if confidence >= 80:
            confidence_level = "High"
        elif confidence >= 60:
            confidence_level = "Medium"
        else:
            confidence_level = "Low"
        
        return {
            'confidence_score': float(confidence),
            'confidence_level': confidence_level,
            'prediction_std': float(std_pred),
            'prediction_mean': float(mean_pred)
        }
            
    
    def explain_all_tasks(self, x_seq: torch.Tensor, x_demo: torch.Tensor, seq_len: torch.Tensor = None) -> Dict:
        """Generate comprehensive explanation for all 4 tasks"""
        if x_seq.dim() == 2:
            x_seq = x_seq.unsqueeze(0)
        if x_demo.dim() == 1:
            x_demo = x_demo.unsqueeze(0)
        if seq_len is None:
            seq_len = torch.tensor([x_seq.shape[1]], dtype=torch.long)
        elif seq_len.dim() == 0:
            seq_len = seq_len.unsqueeze(0)
        
        seq_length = seq_len.item()
        video_length = seq_length / self.fps

        print(f"Computing explanations for 4 ADOS metrics (Video: {video_length:.1f}s)...")

        
        # Get all predictions
        with torch.no_grad():
            x_seq_device = x_seq.to(self.device)
            x_demo_device = x_demo.to(self.device)
            seq_len_device = seq_len.to(self.device)
            all_outputs = self.model(x_seq_device, x_demo_device, seq_len_device)
        
        # Convert to original scale - handle dict output
        predictions = {}
        task_keys = ['severity', 'social_affect', 'rrb', 'comparison']
        
        for i, name in enumerate(self.target_names):
            task_key = task_keys[i]
            if isinstance(all_outputs, dict):
                task_out = all_outputs[task_key]
                if task_key in ['severity', 'comparison']:
                    # For classification, get predicted class
                    pred_value = torch.argmax(task_out[0]).item()
                    predictions[name.lower().replace(' ', '_')] = int(pred_value)
                else:
                    # For regression, get the value and inverse transform
                    pred_scaled = task_out[0, 0].item()
                    if self.target_scalers[i] is not None:
                        pred_value = float(self.target_scalers[i].inverse_transform([[pred_scaled]])[0, 0])
                    else:
                        pred_value = float(pred_scaled)
                    predictions[name.lower().replace(' ', '_')] = pred_value
            else:
                pred_scaled = all_outputs[0, i].item()
                if self.target_scalers[i] is not None:
                    predictions[name.lower().replace(' ', '_')] = float(
                        self.target_scalers[i].inverse_transform([[pred_scaled]])[0, 0]
                    )
                else:
                    predictions[name.lower().replace(' ', '_')] = float(pred_scaled)
        
        # Get demographic values (original scale)
        demo_original = self.demographic_scaler.inverse_transform(x_demo.cpu().numpy())[0]
        predictions['age_input'] = float(demo_original[0])
        predictions['gender_input'] = int(demo_original[1])
        
        # Compute integrated gradients for all tasks
        print("Computing explanations for 4 ADOS metrics...")
        
        explanations_per_task = {}
        for task_idx in range(4):
            task_name = self.target_names[task_idx]
            print(f"  Analyzing {task_name}...")
            
            # Compute confidence for this task
            print(f"    Computing confidence...")
            confidence_info = self.compute_confidence(x_seq, x_demo, seq_len, task_idx)
            
            attr_seq, attr_demo, pred, baseline = self.compute_integrated_gradients(
                x_seq, x_demo, seq_len, task_idx
            )
            
            
            # Get top contributing joints
            joint_contributions = self._compute_joint_contributions(attr_seq, seq_length)
            top_joints_positive = sorted(
                [(j, c) for j, c in joint_contributions.items() if c > 0],
                key=lambda x: abs(x[1]), reverse=True
            )
            top_joints_negative = sorted(
                [(j, c) for j, c in joint_contributions.items() if c < 0],
                key=lambda x: abs(x[1]), reverse=True
            )
            
            # Compute temporal contributions
            temporal_segments = self.compute_temporal_contributions(
                attr_seq, seq_length, window_size_seconds=1.0
            )
            
            # Separate positive and negative temporal influences
            positive_segments = [s for s in temporal_segments if s['influence_direction'] == 'positive'][:5]
            negative_segments = [s for s in temporal_segments if s['influence_direction'] == 'negative'][:5]
            
            # Demographic contributions
            demo_contrib = {
                'age_contribution': float(attr_demo[0]),
                'gender_contribution': float(attr_demo[1])
            }
            
            explanations_per_task[task_name] = {
                'prediction': float(pred),
                'baseline': float(baseline),
                'confidence': confidence_info,
                'joints': {
                    'positive_contributors': [
                        {'joint': j, 'contribution': float(c)} 
                        for j, c in top_joints_positive
                    ],
                    'negative_contributors': [
                        {'joint': j, 'contribution': float(c)} 
                        for j, c in top_joints_negative
                    ]
                },
                'temporal_segments': {
                    'positive_segments': positive_segments,
                    'negative_segments': negative_segments,
                    'all_segments': temporal_segments
                },
                'demographic_contributions': demo_contrib,
                'total_sequence_attribution': float(np.sum(np.abs(attr_seq))),
                'total_demographic_attribution': float(np.sum(np.abs(attr_demo)))
            }
        
        explanation = {
            'predictions': predictions,
            'video_metadata': {
                'duration_seconds': float(video_length),
                'num_frames': int(seq_length),
                'fps': self.fps
            },
            'task_explanations': explanations_per_task,
            'summary': self._generate_summary(predictions, explanations_per_task)
        }
        
        return explanation
    
    def _compute_joint_contributions(self, attributions: np.ndarray, seq_len: int) -> Dict[str, float]:
        """Aggregate contributions per joint"""
        attributions = attributions[:seq_len, :]
        
        # Determine if 2D (150 features) or 3D (222 features)
        if attributions.shape[1] == 150:
            # 2D: first 48 features are joint positions (24 joints * 2 coords)
            joint_attrs = attributions[:, :48].reshape(seq_len, 24, 2)
        elif attributions.shape[1] == 222:
            # 3D: first 72 features are joint positions (24 joints * 3 coords)
            joint_attrs = attributions[:, :72].reshape(seq_len, 24, 3)
        else:
            # Fallback: assume flat joint positions
            num_coords = 2 if attributions.shape[1] < 200 else 3
            joint_attrs = attributions[:, :24*num_coords].reshape(seq_len, 24, num_coords)
        
        joint_contributions = np.sum(joint_attrs, axis=(0, 2))
        
        return {COCO_JOINTS[i]: float(joint_contributions[i]) for i in range(min(len(COCO_JOINTS), len(joint_contributions)))}
    
    def _generate_summary(self, predictions: Dict, task_explanations: Dict) -> str:
        """Generate human-readable summary"""
        summary = "Multi-Task ADOS Assessment (Using Age & Gender as Inputs):\n\n"
        
        summary += f"PREDICTIONS:\n"
        summary += f"  Severity: {predictions['severity']:.1f}\n"
        summary += f"  Social Affect: {predictions['social_affect']:.1f}\n"
        summary += f"  RRB: {predictions['rrb']:.1f}\n"
        summary += f"  Comparison Score: {predictions['comparison_score']:.1f}\n\n"
        
        summary += f"INPUT DEMOGRAPHICS:\n"
        summary += f"  Age: {predictions['age_input']:.1f} years\n"
        summary += f"  Gender: {predictions['gender_input']}\n\n"
        
        # Key findings
        for task_name in ['Severity', 'Social Affect', 'RRB', 'Comparison Score']:
            if task_name in task_explanations:
                exp = task_explanations[task_name]
                top_joint = exp['joints']['positive_contributors'][0] if exp['joints']['positive_contributors'] else {'joint': 'N/A', 'contribution': 0}
                top_time = exp['temporal_segments']['positive_segments'][0] if exp['temporal_segments']['positive_segments'] else None
                demo_total = sum(abs(v) for v in exp['demographic_contributions'].values())
                summary += f"{task_name}: Top joint={top_joint['joint']} ({top_joint['contribution']:+.2f}), "
                summary += f"Demographic impact={demo_total:.2f}\n"
        
        return summary
    
    def visualize_explanation(self, explanation: Dict, save_path: str = None):
        """Visualize multi-task predictions and explanations"""
        fig = plt.figure(figsize=(18, 14))
        gs = fig.add_gridspec(4, 3, hspace=0.4, wspace=0.3)
        
        preds = explanation['predictions']
        video_meta = explanation['video_metadata']
        
        fig.suptitle(
            f"Multi-Task ADOS Prediction\n"
            f"Age: {preds['age_input']:.0f} | Gender: {preds['gender_input']} | "
            f"Severity: {preds['severity']:.1f} | Social Affect: {preds['social_affect']:.1f}\n"
            f"Video: {video_meta['duration_seconds']:.1f}s ({video_meta['num_frames']} frames)",    
            fontsize=14, fontweight='bold'
        )
        
        # Plot 1: All predictions
        ax1 = fig.add_subplot(gs[0, :])
        pred_values = [preds['severity'], preds['social_affect'], preds['rrb'], preds['comparison_score']]
        pred_labels = ['Severity', 'Social\nAffect', 'RRB', 'Comparison\nScore']
        
        bars = ax1.bar(pred_labels, pred_values, color='steelblue', alpha=0.7)
        ax1.set_ylabel('Score')
        ax1.set_title('Predicted ADOS Metrics (Demographics as Inputs)')
        ax1.grid(axis='y', alpha=0.3)
        
        # Plots 2-9: Joint and temporal contributions for each task
        task_names = ['Severity', 'Social Affect', 'RRB']
        
        for task_idx, task_name in enumerate(task_names):
            # Joint contributions
            ax_joint = fig.add_subplot(gs[task_idx + 1, 0])
            task_exp = explanation['task_explanations'][task_name]
            
            all_joints = (task_exp['joints']['positive_contributors'][:3] + 
                         task_exp['joints']['negative_contributors'][:2])
            joints = [j['joint'] for j in all_joints]
            contribs = [j['contribution'] for j in all_joints]
            colors = ['#d62728' if c > 0 else '#2ca02c' for c in contribs]
            
            ax_joint.barh(joints, contribs, color=colors, alpha=0.7)
            ax_joint.axvline(x=0, color='black', linestyle='-', linewidth=0.8)
            ax_joint.set_xlabel('Contribution')
            ax_joint.set_title(f'{task_name}: Top Joints\nPred={task_exp["prediction"]:.2f}', fontsize=10)
            ax_joint.invert_yaxis()
            
            # Temporal contributions
            ax_temporal = fig.add_subplot(gs[task_idx + 1, 1:])
            
            pos_segs = task_exp['temporal_segments']['positive_segments'][:5]
            neg_segs = task_exp['temporal_segments']['negative_segments'][:3]
            
            y_pos = 0
            for seg in pos_segs:
                width = seg['end_time'] - seg['start_time']
                ax_temporal.barh(y_pos, width, left=seg['start_time'], 
                               color='#d62728', alpha=0.6, height=0.8)
                ax_temporal.text(seg['start_time'] + width/2, y_pos, 
                               f"{seg['contribution']:.1f}", 
                               ha='center', va='center', fontsize=8)
                y_pos += 1
            
            y_neg = -1
            for seg in neg_segs:
                width = seg['end_time'] - seg['start_time']
                ax_temporal.barh(y_neg, width, left=seg['start_time'], 
                               color='#2ca02c', alpha=0.6, height=0.8)
                ax_temporal.text(seg['start_time'] + width/2, y_neg, 
                               f"{seg['contribution']:.1f}", 
                               ha='center', va='center', fontsize=8)
                y_neg -= 1
            
            ax_temporal.axhline(y=-0.5, color='black', linestyle='--', linewidth=0.5)
            ax_temporal.set_xlabel('Time (seconds)')
            ax_temporal.set_title(f'{task_name}: Critical Time Segments\n(Red=Problematic, Green=Strength)', fontsize=10)
            ax_temporal.set_xlim(0, video_meta['duration_seconds'])
            ax_temporal.set_ylim(y_neg - 1, y_pos)
            ax_temporal.grid(axis='x', alpha=0.3)
            
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"✅ Visualization saved to {save_path}")
        
        plt.show()
