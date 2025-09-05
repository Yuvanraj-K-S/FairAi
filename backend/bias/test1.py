# test_face_bias.py

from face_bias_evaluator import FaceBiasEvaluator

if __name__ == "__main__":
    # ✅ Point to your dataset path
    dataset_path = r"C:\Users\Prakash P\OneDrive\Desktop\FairAi\backend\dataset\facial_recognition"

    # ✅ Initialize evaluator with default model (model_path=None → InceptionResnetV1)
    evaluator = FaceBiasEvaluator(
        model_path=None,           # <-- default facenet_pytorch model
        dataset_path=dataset_path,
        threshold=0.5,
        augmentations=["flip", "rotation", "brightness", "blur"]
    )

    # ✅ Run evaluation
    report = evaluator.run_evaluation(output_dir="results")

    # ✅ Print results
    print("\n=== Face Bias Evaluation Report ===")
    print("Overall FMR:", report["overall"]["FMR"])
    print("Overall FNMR:", report["overall"]["FNMR"])
    print("Demographic Parity Difference:", report["fairness"]["dp_difference"])
    print("Equalized Odds Difference:", report["fairness"]["eo_difference"])

    print("\nPer-group metrics:")
    for group, metrics in report["by_group"].items():
        print(f"  {group}: FMR={metrics['FMR']:.4f}, FNMR={metrics['FNMR']:.4f}, Acc={metrics['accuracy']:.4f}")

    if report.get("by_augmentation"):
        print("\nPer-augmentation metrics:")
        for aug, metrics in report["by_augmentation"].items():
            print(f"  {aug}: FMR={metrics['FMR']:.4f}, FNMR={metrics['FNMR']:.4f}, Acc={metrics['accuracy']:.4f}")

    print("\n✅ Evaluation complete. Results also saved in 'results/' folder.")