using System;
using UnityEngine;
using TMPro;

public class PlayerCell : MonoBehaviour
{
    private SpriteRenderer spriteRenderer;
    private TextMeshProUGUI nicknameText;

    void Awake()
    {
        spriteRenderer = GetComponent<SpriteRenderer>();
        if (spriteRenderer == null)
        {
            Debug.LogError("FoodCell prefab requires a SpriteRenderer component!");
        }
    }
    
    public void Initialize(Canvas canvas)
    {
        GameObject textObj = new GameObject("NicknameText");
        nicknameText = textObj.AddComponent<TextMeshProUGUI>();
        nicknameText.rectTransform.SetParent(canvas.transform, false);
        nicknameText.alignment = TextAlignmentOptions.Center;
        nicknameText.fontSize = 20;
    }
    
    public void UpdateCell(float x, float y, float radius, Color color, string nickname)
    {
        transform.position = new Vector3(x, y, 0);
        float scaleMultiplier = 2f;
        transform.localScale = new Vector3(radius * scaleMultiplier, radius * scaleMultiplier, 1);
        spriteRenderer.color = color;
        nicknameText.text = nickname;
        nicknameText.rectTransform.position = Camera.main.WorldToScreenPoint(new Vector3(x, y, 0));
    }
    
    void OnDestroy()
    {
        if (nicknameText != null)
        {
            Destroy(nicknameText.gameObject);
        }
    }
}