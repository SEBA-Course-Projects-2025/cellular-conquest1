using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class PlayerCell : MonoBehaviour
{
    private Image image;
    private TextMeshProUGUI nicknameText;

    void Awake()
    {
        image = GetComponent<Image>();
        if (image == null)
        {
            Debug.LogError("PlayerCell prefab requires an Image component!");
        }
        nicknameText = GetComponentInChildren<TextMeshProUGUI>();
    }

    public void SetPositionAndRadius(Vector2 position, float radius, string colorHex, string nickname)
    {
        RectTransform rectTransform = GetComponent<RectTransform>();
        rectTransform.anchoredPosition = position;
        rectTransform.sizeDelta = new Vector2(radius * 2, radius * 2);
        if (ColorUtility.TryParseHtmlString(colorHex, out Color color))
        {
            image.color = color;
        }

        if (nicknameText != null)
        {
            nicknameText.text = nickname;
        }
    }
}