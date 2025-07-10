using UnityEngine;

public class CameraController : MonoBehaviour
{
    public float minRadius = 20f;
    public float maxRadius = 500f;
    public float minCoverage = 1f / 9f; // 0.111
    public float maxCoverage = 3f / 4f; // 0.75
    public float smoothness = 1f; // Increased for faster response

    private Camera mainCamera;
    private Vector2 playerCenter;
    private float totalRadius;

    void Start()
    {
        mainCamera = GetComponent<Camera>();
    }

    public void UpdateCamera(Vector2 center, float radiusSum)
    {
        playerCenter = center;
        totalRadius = radiusSum;
    }

    void Update()
    {
        if (totalRadius > 0)
        {
            // Calculate zoom
            float normRadius = Mathf.Clamp01((totalRadius - minRadius) / (maxRadius - minRadius));
            float coverage = Mathf.Lerp(minCoverage, maxCoverage, normRadius);
            float targetOrthoSize = totalRadius / coverage;
            mainCamera.orthographicSize = Mathf.Lerp(mainCamera.orthographicSize, targetOrthoSize, smoothness);

            // Follow player
            Vector3 targetPosition = new Vector3(playerCenter.x, playerCenter.y, -10f);
            transform.position = Vector3.Lerp(transform.position, targetPosition, smoothness);
        }
    }
}