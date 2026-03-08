"""
LLM Report Generator - Creates comprehensive clinical reports using Gemini Flash 2.0
"""

import json
from datetime import datetime
import google.generativeai as genai

# -------------------------------
# PROMPT CREATION FUNCTION
# -------------------------------

def create_llm_prompt(report_package):
    """
    Create a comprehensive prompt for the LLM to generate a clinical report
    """
    analysis = report_package['analysis']
    dsm5 = report_package.get('dsm5_description', {})
    nice = report_package.get('nice_guidelines', {})
    therapies = report_package.get('therapies', [])
    
    # Handle both old and new score structures
    scores = analysis.get('scores', {})
    if 'ensemble' in scores:
        # New structure with all models
        ensemble_scores = scores['ensemble']
        has_2d = 'model_2d' in scores
        has_3d = 'model_3d' in scores
    else:
        # Old structure
        ensemble_scores = scores
        has_2d = False
        has_3d = False
    
    prompt = f"""You are a clinical assistant helping to generate an autism assessment report for a therapist. 
Based on the following data, create a comprehensive, professional clinical report.

=== ASSESSMENT RESULTS ===

Patient Demographics:
- Age: {analysis['demographics']['age']} years
- Gender: {analysis['demographics']['gender']}

Autism Severity Assessment:
- DSM-5 Severity Level: Level {analysis['severity']['level']}
- Confidence: {analysis['severity']['confidence']:.1%}
- Clinical Description: {dsm5.get('label', 'N/A')}

Clinical Scores:
- Social Affect Score: {ensemble_scores.get('social_affect', 0):.2f}
- Restricted/Repetitive Behaviors (RRB) Score: {ensemble_scores.get('rrb', 0):.2f}
- Comparison Score: {ensemble_scores.get('comparison_score', 0)}
"""

    # Add model comparison if multiple models available
    if has_2d or has_3d:
        prompt += "\nModel Comparisons:\n"
        if has_2d:
            model_2d = scores['model_2d']
            prompt += f"- 2D Model: Social Affect={model_2d.get('social_affect', 0):.2f}, RRB={model_2d.get('rrb', 0):.2f}\n"
        if has_3d:
            model_3d = scores['model_3d']
            prompt += f"- 3D Model: Social Affect={model_3d.get('social_affect', 0):.2f}, RRB={model_3d.get('rrb', 0):.2f}\n"
        prompt += "\n"
    
    prompt += f"""
Video Analysis:
- Duration: {analysis['video_info'].get('video_duration_seconds', 'N/A')} seconds
- Frames Analyzed: {analysis['video_info'].get('frames_extracted', 'N/A')}
- Model Type: {analysis['model_type']}
"""

    # Biomechanical analysis if available (check both 2D and 3D)
    if 'joint_contributions_2d' in analysis or 'joint_contributions_3d' in analysis:
        prompt += "\n=== BIOMECHANICAL ANALYSIS ===\n\n"
        
        # 2D Model joint contributions
        if 'joint_contributions_2d' in analysis:
            prompt += "2D Model Analysis:\n"
            for task_name, task_data in analysis['joint_contributions_2d'].items():
                prompt += f"\n{task_name}:\n"
                prompt += f"  Prediction: {task_data.get('prediction', 'N/A')}\n"
                if task_data.get('top_positive_joints'):
                    prompt += "  Top 3 Positive Joint Contributors:\n"
                    for joint in task_data['top_positive_joints']:
                        prompt += f"    • {joint['joint']}: {joint['contribution']:.3f}\n"
                if task_data.get('top_negative_joints'):
                    prompt += "  Top 3 Negative Joint Contributors:\n"
                    for joint in task_data['top_negative_joints']:
                        prompt += f"    • {joint['joint']}: {joint['contribution']:.3f}\n"
            prompt += "\n"

        # 3D Model joint contributions
        if 'joint_contributions_3d' in analysis:
            prompt += "3D Model Analysis:\n"
            for task_name, task_data in analysis['joint_contributions_3d'].items():
                prompt += f"\n{task_name}:\n"
                prompt += f"  Prediction: {task_data.get('prediction', 'N/A')}\n"
                if task_data.get('top_positive_joints'):
                    prompt += "  Top 3 Positive Joint Contributors:\n"
                    for joint in task_data['top_positive_joints']:
                        prompt += f"    • {joint['joint']}: {joint['contribution']:.3f}\n"
                if task_data.get('top_negative_joints'):
                    prompt += "  Top 3 Negative Joint Contributors:\n"
                    for joint in task_data['top_negative_joints']:
                        prompt += f"    • {joint['joint']}: {joint['contribution']:.3f}\n"
            prompt += "\n"

    # DSM-5
    if dsm5:
        prompt += "\n=== DSM-5 SEVERITY CRITERIA ===\n\n"
        social_comm = dsm5.get('social_communication', {})
        rrb = dsm5.get('restricted_repetitive_behaviors', {})
        if social_comm:
            prompt += f"Social Communication:\n{social_comm.get('verbatim', '')}\n\n"
        if rrb:
            prompt += f"Restricted/Repetitive Behaviors:\n{rrb.get('verbatim', '')}\n\n"

    # NICE guidelines
    if nice:
        prompt += "\n=== NICE CLINICAL GUIDELINES ===\n\n"
        support_profile = nice.get('support_needs_profile', {})
        prompt += f"Support Intensity: {support_profile.get('support_intensity', 'N/A')}\n"
        prompt += f"Communication Level: {support_profile.get('communication', 'N/A')}\n"
        prompt += f"Social Interaction: {support_profile.get('social_interaction', 'N/A')}\n"
        prompt += f"Behavioral Flexibility: {support_profile.get('behavioral_flexibility', 'N/A')}\n\n"
        delivery = support_profile.get('delivery_requirements', [])
        if delivery:
            prompt += f"Delivery Requirements: {', '.join(delivery)}\n\n"
        exclusions = nice.get('explicit_exclusions', [])
        if exclusions:
            prompt += f"Not Recommended: {', '.join(exclusions)}\n\n"

    # Therapies
    prompt += "\n=== RECOMMENDED EVIDENCE-BASED INTERVENTIONS ===\n\n"
    prompt += f"Total Therapies Recommended: {len(therapies)}\n\n"
    for i, therapy in enumerate(therapies[:10], 1):
        prompt += f"{i}. {therapy['therapy_name']}\n"
        prompt += f"   Category: {therapy['nice_category']}\n"
        prompt += f"   Evidence Level: {therapy['evidence_basis']}\n"
        prompt += f"   Relevance Score: {therapy['relevance_score']}\n"
        if therapy.get('intervention_targets'):
            prompt += f"   Targets: {therapy['intervention_targets']}\n"
        prompt += f"   Description: {therapy['summary']}\n"
        if therapy.get('source_link'):
            prompt += f"   Resource: {therapy['source_link']}\n"
        prompt += "\n"

    prompt += """
=== REPORT REQUIREMENTS ===

Generate a concise, professional clinical report. Use bullet points and clear progression.

**STRUCTURE:**

1. ASSESSMENT SUMMARY
   - Patient demographics and video details (2-3 sentences)
   - Severity level, confidence, and key scores (bullet points)

2. BIOMECHANICAL PATTERNS (if available)
   - Present as compact bullet lists
   - Format: "Task → Top 3 Positive: [joint1 (+X.XX), joint2, joint3] | Top 3 Negative: [joint1 (-X.XX), joint2, joint3]"
   - One line per task (Severity, Social Affect, RRB, Comparison Score)
   - Include both 2D and 3D if available, clearly labeled

3. CLINICAL PATHWAY (This is critical - show clear progression)
   
   **DSM-5 Classification:**
   - State the severity level and what it means (1 sentence)
   
   **↓ NICE Guidelines Applied:**
   - List allowed intervention categories based on severity
   - Brief justification (1 sentence)
   
   **↓ AFIRM Evidence-Based Matching:**
   - Explain how therapies were filtered by NICE categories and age
   - State total therapies found → filtered count (1 sentence)

4. RECOMMENDED INTERVENTIONS (Top 5-7 therapies)
   
   For each therapy:
   - **Therapy Name** (Category: X | Evidence: Y | Relevance: Z)
   - One-line summary of what it does
   - Link: [URL]

5. DISCLAIMER (2-3 sentences)
   - This is screening, not diagnosis
   - Recommend formal clinical evaluation
   - Evidence-based recommendations

**STYLE REQUIREMENTS:**
- Use bullet points extensively
- Keep sentences short and clear
- Focus on facts and progression
- No lengthy explanations
- Do not include any technical metrics related to the AI model or vector database like relevance score etc. Limit to metrics actually useful to a therapist.
- Maximum clinical impact with minimum words
- A brief 1-line explanation for each metric presented.
- Show the decision pathway: DSM-5 → NICE → AFIRM clearly
"""
    return prompt

# -------------------------------
# GEMINI API CALL
# -------------------------------

def generate_report_with_gemini(report_package, api_key):
    """
    Generate report using Google Gemini Flash 2.5
    """
    prompt = create_llm_prompt(report_package)
    
    # Configure API
    genai.configure(api_key=api_key)
    
    # Initialize model
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Generate content
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=4000,
        )
    )
    
    return response.text


# -------------------------------
# SAVE REPORT
# -------------------------------

def save_report(report_text, report_package, output_path="clinical_report.json"):
    """Save generated report to JSON file with metadata"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Create comprehensive JSON structure
    report_json = {
        "metadata": {
            "generated_at": timestamp,
            "report_type": "autism_assessment_clinical_report",
            "version": "1.0"
        },
        "patient_info": {
            "age": report_package['analysis']['demographics']['age'],
            "gender": report_package['analysis']['demographics']['gender']
        },
        "assessment_results": {
            "severity_level": report_package['analysis']['severity']['level'],
            "severity_confidence": report_package['analysis']['severity']['confidence'],
            "scores": report_package['analysis']['scores']
        },
        "clinical_report": report_text,
        "therapies_recommended": report_package.get('therapies', []),
        "dsm5_classification": report_package.get('dsm5_description'),
        "nice_guidelines": report_package.get('nice_guidelines')
    }
    
    # Save as JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report_json, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Report saved to: {output_path}")
    
    # Also save a plain text version for easy reading
    txt_path = output_path.replace('.json', '.txt')
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(f"AUTISM ASSESSMENT CLINICAL REPORT\n")
        f.write(f"Generated: {timestamp}\n")
        f.write("="*70 + "\n\n")
        f.write(report_text)
    print(f"✓ Text version saved to: {txt_path}")

# -------------------------------
# MAIN GENERATOR
# -------------------------------

def generate_report(report_package_path, api_key, output_path="clinical_report.json"):
    """
    Main function to generate clinical report using Gemini
    
    Args:
        report_package_path: Path to report_package.json
        api_key: Google AI API key
        output_path: Where to save the report
        
    Returns:
        str: Generated report text
    """
    print("="*70)
    print("CLINICAL REPORT GENERATOR - GEMINI FLASH 2.5")
    print("="*70)
    print()
    
    print("📦 Loading report package...")
    with open(report_package_path, "r", encoding="utf-8") as f:
        report_package = json.load(f)
    print("   ✓ Loaded")
    print()
    
    print("🤖 Generating report using Gemini Flash 2.5...")
    try:
        report_text = generate_report_with_gemini(report_package, api_key)
        print("   ✓ Report generated")
        print()
        
        # Save report
        save_report(report_text, report_package, output_path)
        
        print("\n" + "="*70)
        print("✅ REPORT GENERATION COMPLETE!")
        print("="*70)
        
        return report_text
        
    except Exception as e:
        print(f"\n❌ Error generating report: {e}")
        import traceback
        traceback.print_exc()
        return None

# -------------------------------
# SCRIPT ENTRY POINT
# -------------------------------

if __name__ == "__main__":
    import os
    
    # Get API key from environment
    gemini_key = os.environ.get("GEMINI_API_KEY")
    
    if gemini_key:
        print("✓ Found Gemini API key in environment")
        
        report_text = generate_report(
            report_package_path="report_package.json",
            api_key=gemini_key,
            output_path="clinical_report.txt"
        )
        
        if report_text:
            print("\nReport Preview:")
            print("-" * 70)
            print(report_text[:500] + "...")
    
    else:
        print("⚠️  No API key found.")
        print("\nTo use this tool:")
        print("  1. Get a free API key from:")
        print("     https://aistudio.google.com/app/apikey")
        print()
        print("  2. Set environment variable:")
        print("     export GEMINI_API_KEY='your-key-here'")
        print()
        print("Or call programmatically:")
        print("  generate_report('report_package.json', 'your-api-key')")