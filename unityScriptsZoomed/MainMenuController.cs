using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.SceneManagement;

public class MainMenuController : MonoBehaviour
{
    public TMP_InputField nicknameInput;
    public Canvas nicknameCanvas;
    public Canvas modeSelectionCanvas;
    public Canvas roomIdCanvas;
    public TMP_InputField roomIdInput;

    public void Awake()
    {
        nicknameCanvas.gameObject.SetActive(true);
        modeSelectionCanvas.gameObject.SetActive(false);
        roomIdCanvas.gameObject.SetActive(false);
    }

    public void OnJoinClicked()
    {
        if (string.IsNullOrEmpty(nicknameInput.text))
        {
            nicknameInput.text = "UnityPlayer";
        }
        PlayerPrefs.SetString("Nickname", nicknameInput.text);
        PlayerPrefs.Save();

        nicknameCanvas.gameObject.SetActive(false);
        modeSelectionCanvas.gameObject.SetActive(true);
    }

    public void OnFFAClicked()
    {
        PlayerPrefs.SetString("Mode", "ffa");
        PlayerPrefs.DeleteKey("RoomId");
        PlayerPrefs.Save();
        SceneManager.LoadScene("GameScene");
    }

    public void OnTeamsClicked()
    {
        PlayerPrefs.SetString("Mode", "teams");
        PlayerPrefs.Save();
        modeSelectionCanvas.gameObject.SetActive(false);
        roomIdCanvas.gameObject.SetActive(true);
    }

    public void OnCreateRoomClicked()
    {
        PlayerPrefs.SetString("RoomId", "new");
        PlayerPrefs.Save();
        SceneManager.LoadScene("GameScene");
    }

    public void OnJoinRoomClicked()
    {
        string roomIdText = roomIdInput.text.Trim();

        if (string.IsNullOrEmpty(roomIdText) || !Guid.TryParse(roomIdText, out Guid roomId))
        {
            Debug.LogError("Invalid Room ID. Please enter a valid GUID.");
            return;
        }
        PlayerPrefs.SetString("RoomId", roomIdText);
        PlayerPrefs.Save();
        SceneManager.LoadScene("GameScene");
    }

    public void OnDeathMatchClicked()
    {
        PlayerPrefs.SetString("Mode", "deathmatch");
        PlayerPrefs.Save();
        SceneManager.LoadScene("GameScene");
    }
}
