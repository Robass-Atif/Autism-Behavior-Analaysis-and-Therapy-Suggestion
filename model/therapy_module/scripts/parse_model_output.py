"""
Module to parse model output and extract relevant information for therapy retrieval
Enhanced to use all three model types (2D, 3D, ensemble) for comprehensive analysis
"""

import json

def parse_model_output(model_output_path_or_dict):
    """
    Parse model output JSON and extract severity, age, and joint contributions.
    Supports both a single dictionary/file and a list of dictionaries/files 
    (aggregating across the ensemble by taking the mode of severity).
    """
    # Load JSON if path provided
    if isinstance(model_output_path_or_dict, str):
        with open(model_output_path_or_dict, 'r') as f:
            data = json.load(f)
    else:
        data = model_output_path_or_dict

    # Ensure we're working with a list
    if not isinstance(data, list):
        data_list = [data]
    else:
        data_list = data
        
    # 1. Severity Level (mode, tie-break to max)
    # Fallback chain: ensemble -> 3D -> 2D -> 0
    from collections import Counter
    def _get_severity(d):
        ep = d.get("ensemble_prediction") or {}
        if ep.get("severity") is not None:
            return ep["severity"]
        p3d = d.get("predictions_3d") or {}
        if p3d.get("severity") is not None:
            return p3d["severity"]
        p2d = d.get("predictions_2d") or {}
        return p2d.get("severity", 0)

    severities = [_get_severity(d) for d in data_list]
    severity_counts = Counter(severities)
    max_count = max(severity_counts.values()) if severity_counts else 0
    modes = [sev for sev, count in severity_counts.items() if count == max_count]
    raw_severity = max(modes) if modes else 0
    severity_level = raw_severity + 1  # 0->1, 1->2, 2->3
    
    # 2. Age (mode)
    ages = [d.get("input_age", 0) for d in data_list]
    age = Counter(ages).most_common(1)[0][0] if ages else 0
    
    # 3. Gender (mode)
    genders = [d.get("input_gender", "Unknown") for d in data_list]
    gender_mode = Counter(genders).most_common(1)[0][0] if genders else "Unknown"
    gender_map = {"M": "Male", "F": "Female", "Unknown": "Unknown"}
    gender = gender_map.get(gender_mode, gender_mode)
    
    # 4. Aggregate joint contributions
    joint_sums = {
        "2d": {},
        "3d": {}
    }
    
    for d in data_list:
        for model_key, data_key in [("2d", "predictions_2d"), ("3d", "predictions_3d")]:
            predictions = d.get(data_key) or {}  # guard against explicit null
            explainability = predictions.get("explainability") or {}  # guard against explicit null
            if not explainability: continue
            
            task_explanations = explainability.get("task_explanations", {})
            for task_name, task_data in task_explanations.items():
                if task_name not in joint_sums[model_key]:
                    joint_sums[model_key][task_name] = {"positive": Counter(), "negative": Counter()}
                
                joints_data = task_data.get("joints", {})
                for p in joints_data.get("positive_contributors", []):
                    joint_sums[model_key][task_name]["positive"][p["joint"]] += p["contribution"]
                for n in joints_data.get("negative_contributors", []):
                    joint_sums[model_key][task_name]["negative"][n["joint"]] += n["contribution"]
                    
    # Extract the top 3 for each
    joint_contributions = {}
    for model_key, tasks in joint_sums.items():
        joint_contributions[model_key] = {}
        for task_name, counts in tasks.items():
            sorted_pos = sorted(counts["positive"].items(), key=lambda x: x[1], reverse=True)[:3]
            top_pos = [{"joint": k, "contribution": v} for k, v in sorted_pos]
            
            sorted_neg = sorted(counts["negative"].items(), key=lambda x: x[1])[:3]
            top_neg = [{"joint": k, "contribution": v} for k, v in sorted_neg]
            
            joint_contributions[model_key][task_name] = {
                "top_positive_joints": top_pos,
                "top_negative_joints": top_neg
            }
            
    return {
        "severity_level": severity_level,
        "age": age,
        "input_gender": gender,
        "raw_severity": raw_severity,
        "joint_contributions": joint_contributions,
    }


def extract_comprehensive_analysis(model_output_path_or_dict, model_type="ensemble"):
    """
    Extract comprehensive analysis including severity, demographics, and joint contributions
    
    Args:
        model_output_path_or_dict: Either path to JSON file or dict object
        model_type: "ensemble", "2d", or "3d" - which prediction to use
        
    Returns:
        dict: Comprehensive analysis with all relevant metrics
    """
    # Load JSON if path provided
    if isinstance(model_output_path_or_dict, str):
        with open(model_output_path_or_dict, 'r') as f:
            data = json.load(f)
    else:
        data = model_output_path_or_dict
    
    # Determine which prediction set to use
    if model_type == "ensemble":
        prediction = data.get("ensemble_prediction", {})
        explainability = None  # Ensemble doesn't have explainability
    elif model_type == "2d":
        prediction = data.get("predictions_2d", {})
        explainability = prediction.get("explainability", {})
    elif model_type == "3d":
        prediction = data.get("predictions_3d", {})
        explainability = prediction.get("explainability", {})
    else:
        raise ValueError(f"Invalid model_type: {model_type}")
    
    # Extract basic predictions
    raw_severity = prediction.get("severity", 0)
    severity_level = raw_severity + 1  # Convert to Level 1, 2, or 3
    
    result = {
        "severity": {
            "level": severity_level,
            "raw_value": raw_severity,
            "confidence": prediction.get("severity_confidence", 0)
        },
        "demographics": {
            "age": data.get("input_age", 0),
            "gender": data.get("input_gender", "Unknown")
        },
        "scores": {
            "social_affect": prediction.get("social_affect", 0),
            "rrb": prediction.get("rrb", 0),
            "comparison_score": prediction.get("comparison_score", 0),
            "comparison_confidence": prediction.get("comparison_confidence", 0)
        },
        "video_info": data.get("processing_info", {}),
        "model_type": model_type
    }
    
    # Extract joint contributions if explainability data exists
    if explainability:
        result["joint_contributions"] = extract_joint_contributions(explainability)
    
    return result


def extract_all_models_analysis(model_output_path_or_dict):
    """
    Extract comprehensive analysis from ALL three model types (2D, 3D, Ensemble).
    If a list of inputs is provided, delegates to parse_model_output to aggregate.
    """
    # Simply use parse_model_output to handle the list/single aggregation logic uniformly
    parsed = parse_model_output(model_output_path_or_dict)
    
    return {
        "severity": {
            "level": parsed["severity_level"],
            "raw_value": parsed["raw_severity"],
        },
        "demographics": {
            "age": parsed["age"],
        },
        "model_type": "all_models_aggregated",
        "joint_contributions_2d": parsed.get("joint_contributions", {}).get("2d", {}),
        "joint_contributions_3d": parsed.get("joint_contributions", {}).get("3d", {})
    }


def extract_joint_contributions(explainability):
    """
    Extract top 3 joint contributors (positive and negative) from explainability data

    Args:
        explainability: Explainability dict from model output

    Returns:
        dict: Joint contributions for each task with top 3 positive and negative
    """
    task_explanations = explainability.get("task_explanations", {})

    joint_analysis = {}

    for task_name, task_data in task_explanations.items():
        joints_data = task_data.get("joints", {})

        positive_contributors = joints_data.get("positive_contributors", [])
        negative_contributors = joints_data.get("negative_contributors", [])

        top_positive = sorted(
            positive_contributors,
            key=lambda x: x["contribution"],
            reverse=True
        )[:3]

        top_negative = sorted(
            negative_contributors,
            key=lambda x: x["contribution"]
        )[:3]

        joint_analysis[task_name] = {
            "prediction": task_data.get("prediction"),
            "confidence": task_data.get("confidence", {}),
            "top_positive_joints": top_positive,
            "top_negative_joints": top_negative,
            "demographic_contributions": task_data.get("demographic_contributions", {})
        }

    return joint_analysis


def create_retrieval_input(model_output_path_or_dict):
    """
    Create simple input format for therapy retrieval system
    
    Args:
        model_output_path_or_dict: Either path to JSON file or dict object
        
    Returns:
        tuple: (severity_level, age)
    """
    parsed = parse_model_output(model_output_path_or_dict)
    return parsed["severity_level"], parsed["age"]


def create_report_data(model_output_path_or_dict, use_all_models=True):
    """
    Create comprehensive data package for LLM report generation
    
    Args:
        model_output_path_or_dict: Either path to JSON file or dict object
        use_all_models: If True, include data from all models (2D, 3D, Ensemble)
        
    Returns:
        dict: Complete data package for report generation
    """
    # Get comprehensive analysis from all models
    if use_all_models:
        analysis = extract_all_models_analysis(model_output_path_or_dict)
    else:
        # Fallback to ensemble only
        analysis = extract_comprehensive_analysis(model_output_path_or_dict, "ensemble")
    
    # Load DSM-5 and NICE data
    try:
        with open("data/dsm5_severity.json", "r") as f:
            dsm5_data = json.load(f)
    except:
        dsm5_data = None
    
    # Get DSM-5 description for this severity level
    dsm5_description = None
    if dsm5_data:
        for level in dsm5_data.get("severity_levels", []):
            if level.get("severity_level") == f"Level {analysis['severity']['level']}":
                dsm5_description = level
                break

    report_package = {
        "analysis": analysis,
        "dsm5_description": dsm5_description,
        "timestamp": None,  # Add when generating report
        "therapies": None   # Add after retrieval
    }
    
    return report_package


# Example usage and testing
if __name__ == "__main__":
    # Test with sample data
    test_file = "model_output.json"
    
    print("="*70)
    print("TESTING MODEL OUTPUT PARSER - ALL MODELS")
    print("="*70)
    
    try:
        # Test basic parsing
        print("\n1. Basic Parsing for Retrieval:")
        print("-" * 70)
        severity_level, age = create_retrieval_input(test_file)
        print(f"Severity Level: {severity_level}")
        print(f"Age: {age}")
        
        # Test comprehensive analysis (all models)
        print("\n2. Comprehensive Analysis (ALL MODELS):")
        print("-" * 70)
        analysis = extract_all_models_analysis(test_file)
        print(f"Severity: Level {analysis['severity']['level']} "
              f"(confidence: {analysis['severity']['confidence']:.2%})")
        print(f"Age: {analysis['demographics']['age']}, "
              f"Gender: {analysis['demographics']['gender']}")
        
        print("\nEnsemble Scores:")
        print(f"  Social Affect: {analysis['scores']['ensemble']['social_affect']:.2f}")
        print(f"  RRB: {analysis['scores']['ensemble']['rrb']:.2f}")
        
        if 'model_2d' in analysis['scores']:
            print("\n2D Model Scores:")
            print(f"  Social Affect: {analysis['scores']['model_2d']['social_affect']:.2f}")
            print(f"  RRB: {analysis['scores']['model_2d']['rrb']:.2f}")
        
        if 'model_3d' in analysis['scores']:
            print("\n3D Model Scores:")
            print(f"  Social Affect: {analysis['scores']['model_3d']['social_affect']:.2f}")
            print(f"  RRB: {analysis['scores']['model_3d']['rrb']:.2f}")
        
        # Show joint contributions from 2D model
        if "joint_contributions_2d" in analysis:
            print("\n2D Model - Top Joint Contributors (Severity):")
            severity_joints = analysis['joint_contributions_2d'].get('Severity', {})
            
            print("\n  Positive:")
            for joint in severity_joints.get('top_positive_joints', []):
                print(f"    • {joint['joint']}: {joint['contribution']:.4f}")
            
            print("\n  Negative:")
            for joint in severity_joints.get('top_negative_joints', []):
                print(f"    • {joint['joint']}: {joint['contribution']:.4f}")
        
        # Show joint contributions from 3D model
        if "joint_contributions_3d" in analysis:
            print("\n3D Model - Top Joint Contributors (Severity):")
            severity_joints = analysis['joint_contributions_3d'].get('Severity', {})
            
            print("\n  Positive:")
            for joint in severity_joints.get('top_positive_joints', []):
                print(f"    • {joint['joint']}: {joint['contribution']:.4f}")
            
            print("\n  Negative:")
            for joint in severity_joints.get('top_negative_joints', []):
                print(f"    • {joint['joint']}: {joint['contribution']:.4f}")
        
        # Test report data package
        print("\n3. Report Data Package (with all models):")
        print("-" * 70)
        report_data = create_report_data(test_file, use_all_models=True)
        print(f"Package contains:")
        print(f"  • Analysis: ✓")
        print(f"  • Multiple Models: ✓")
        print(f"  • Joint Contributions 2D: {'✓' if 'joint_contributions_2d' in report_data['analysis'] else '✗'}")
        print(f"  • Joint Contributions 3D: {'✓' if 'joint_contributions_3d' in report_data['analysis'] else '✗'}")
        print(f"  • DSM-5 Data: {'✓' if report_data['dsm5_description'] else '✗'}")
        print(f"  • NICE Guidelines: {'✓' if report_data['nice_guidelines'] else '✗'}")
        
        # Save test output
        with open("test_analysis_output.json", "w") as f:
            json.dump(report_data, f, indent=2)
        print(f"\n✓ Test output saved to: test_analysis_output.json")
        
    except FileNotFoundError:
        print(f"\n⚠️  Test file '{test_file}' not found.")
        print("Please save your model output as 'model_output.json' to test.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()