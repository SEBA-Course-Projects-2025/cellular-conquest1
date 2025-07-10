using UnityEngine;
using TMPro;

public class ProfileUI : MonoBehaviour
{
    public TMP_InputField enteredName;

    public TextMeshProUGUI nameField;

    public TextMeshProUGUI nameInitial;

    public void SetNameInProfile()
    {
        nameField.text = enteredName.text;
        nameInitial.text = enteredName.text.Substring(0,1);
    }
}
