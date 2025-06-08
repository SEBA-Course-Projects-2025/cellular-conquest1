using UnityEngine;
using UnityEngine.UI;

public class FoodCell : MonoBehaviour
{
    private Image image;

    void Awake()
    {
        image = GetComponent<Image>();
        if (image == null)
        {
            Debug.LogError("Food prefab requires an Image component!");
        }
    }

    public void SetPositionAndRadius(Vector2 position, float radius, string colorHex)
    {
        RectTransform rectTransform = GetComponent<RectTransform>();
        rectTransform.anchoredPosition = position;
        rectTransform.sizeDelta = new Vector2(radius * 2, radius * 2);
        if (ColorUtility.TryParseHtmlString(colorHex, out Color color))
        {
            image.color = color;
        }
    }
}