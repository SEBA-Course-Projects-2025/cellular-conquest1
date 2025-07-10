using UnityEngine;

public class FoodCell : MonoBehaviour
{
    private SpriteRenderer spriteRenderer;

    void Awake()
    {
        spriteRenderer = GetComponent<SpriteRenderer>();
        if (spriteRenderer == null)
        {
            Debug.LogError("FoodCell prefab requires a SpriteRenderer component!");
        }
    }
    
    public void UpdateFood(float x, float y, float radius, Color color)
    {
        transform.position = new Vector3(x, y, 0);
        float scaleMultiplier = 2f;
        transform.localScale = new Vector3(radius * scaleMultiplier, radius * scaleMultiplier, 1);
        GetComponent<SpriteRenderer>().color = color;
    }
}