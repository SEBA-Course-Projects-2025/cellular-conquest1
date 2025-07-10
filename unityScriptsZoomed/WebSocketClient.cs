using UnityEngine;
using NativeWebSocket;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using TMPro;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class WebSocketClient : MonoBehaviour
{
    private WebSocket websocket;
    private Guid playerId;
    private string nickname = "UnityPlayer";

    private Vector2 currentDirection = Vector2.zero;
    private bool isDead = false;
    private int currentScore = 0;
    private float speedPoints = 0f;
    private string roomId = "";

    public GameObject foodPrefab;
    public GameObject playerCellPrefab;
    public CameraController cameraController; // Reference to CameraController

    public Canvas canvas;
    public TextMeshProUGUI scoreText;
    public Transform leaderboardContent;
    public Canvas gameOverCanvas;
    public Canvas menuCanvas;
    public TextMeshProUGUI nameTextMenu;
    public TextMeshProUGUI scoreTextMenu;
    public Image speedBarFill;
    public TextMeshProUGUI roomIdText;
    public Button copyRoomIdButton;

    private RectTransform canvasRect;
    private Vector2 canvasCenter;

    private Dictionary<string, GameObject> foodObjects = new Dictionary<string, GameObject>();
    private Dictionary<string, GameObject> playerCellObjects = new Dictionary<string, GameObject>();

    private void Awake()
    {
        if (canvas != null)
        {
            canvasRect = canvas.GetComponent<RectTransform>();
            if (canvasRect == null)
            {
                Debug.LogError("Canvas does not have a RectTransform component!");
            }
            else
            {
                canvasCenter = canvasRect.sizeDelta * 0.5f;
            }
        }
    }

    async void Start()
    {
        if (foodPrefab == null || playerCellPrefab == null || canvas == null || cameraController == null)
        {
            Debug.LogError("Food, PlayerCell prefab, Canvas, or CameraController not assigned!");
            return;
        }

        menuCanvas.gameObject.SetActive(true);
        nameTextMenu.text = $"Name: {nickname}";
        scoreTextMenu.text = "Score: 0";

        websocket = new WebSocket("ws://161.35.75.14:8080/ws");

        websocket.OnOpen += () =>
        {
            Debug.Log("Connection open!");
            SendJoin();
        };

        websocket.OnError += (e) =>
        {
            Debug.LogError("WebSocket Error: " + e);
        };

        websocket.OnClose += (e) =>
        {
            Debug.Log("Connection closed!");
        };

        websocket.OnMessage += (bytes) =>
        {
            var message = Encoding.UTF8.GetString(bytes);
            HandleMessage(message);
        };

        try
        {
            await websocket.Connect();
            Debug.Log("Trying to connect to ws://161.35.75.14:8080/");
        }
        catch (Exception ex)
        {
            Debug.LogError("Connection failed: " + ex.Message);
        }

        copyRoomIdButton.onClick.AddListener(CopyRoomIdToClipboard);
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        websocket?.DispatchMessageQueue();
#endif
        Vector2 mousePos = Input.mousePosition;
        Vector2 direction = mousePos - canvasCenter;
        direction = direction.normalized;

        if (direction != currentDirection)
        {
            currentDirection = direction;
            SendInput(direction);
        }

        if (Input.GetKeyDown(KeyCode.Space))
        {
            SendSplit();
        }

        if (Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift))
        {
            SendSpeedup();
        }
        if (Input.GetKeyDown(KeyCode.Escape)) { Application.Quit(); }
    }

    private void SendJoin()
    {
        nickname = PlayerPrefs.GetString("Nickname", "UnityPlayer");
        string mode = PlayerPrefs.GetString("Mode", "ffa");
        string roomId = PlayerPrefs.GetString("RoomId", "");
        object privateServer = roomId == "new" ? (object)true : (string.IsNullOrEmpty(roomId) ? null : Guid.Parse(roomId));

        var joinPayload = new
        {
            type = "join",
            nickname = nickname,
            mode = mode,
            privateServer = privateServer
        };
        SendMessage(joinPayload);
    }

    private void SendInput(Vector2 direction)
    {
        if (isDead) return;
        var inputPayload = new
        {
            type = "input",
            direction = new
            {
                x = direction.x,
                y = direction.y
            }
        };
        SendMessage(inputPayload);
    }

    private void SendSplit()
    {
        if (isDead) return;
        var splitPayload = new
        {
            type = "split"
        };
        SendMessage(splitPayload);
    }

    private void SendSpeedup()
    {
        if (isDead) return;
        var speedupPayload = new
        {
            type = "speedup"
        };
        SendMessage(speedupPayload);
    }

    private void SendLeave()
    {
        var leavePayload = new
        {
            type = "leave"
        };
        SendMessage(leavePayload);
    }

    private void SendMessage(object message)
    {
        string json = JsonConvert.SerializeObject(message);
        websocket.SendText(json);
    }

    private void HandleMessage(string message)
    {
        JObject obj = JObject.Parse(message);
        string type = obj["type"]?.ToString();

        switch (type)
        {
            case "playerData":
                playerId = Guid.Parse(obj["id"]?.ToString() ?? "");
                roomId = obj["roomId"]?.ToString() ?? "";
                nickname = obj["nickname"]?.ToString() ?? nickname;
                nameTextMenu.text = $"Name: {nickname}";
                roomIdText.text = $"Room ID: {roomId}";
                Debug.Log($"Joined game as {nickname}, ID: {playerId}, Room ID: {roomId}");
                break;

            case "gameState":
                HandleGameState(obj);
                break;

            case "death":
                int score = obj["score"]?.ToObject<int>() ?? 0;
                Debug.Log($"You died. Final Score: {score}");
                isDead = true;
                SendLeave();
                ShowGameOverScreen();
                ClearGameObjects();
                break;

            case "leaderboard":
                HandleLeaderboard(obj);
                break;
        }
    }

    private void HandleGameState(JObject gameState)
    {
        Debug.Log($"Received game state at {gameState["timestamp"]}");

        var visibleFood = gameState["visibleFood"]?.ToObject<List<FoodData>>();
        var visiblePlayers = gameState["visiblePlayers"]?.ToObject<List<PlayerData>>();

        if (visibleFood == null || visiblePlayers == null)
        {
            Debug.LogError("Invalid gameState data");
            return;
        }

        // Clear all existing player cells to prevent trails
        foreach (var cell in playerCellObjects.Values)
        {
            Destroy(cell);
        }
        //playerCellObjects.Clear();

        // Handle food
        var existingFoodKeys = new HashSet<string>(foodObjects.Keys);
        if (visibleFood != null)
        {
            for (int i = 0; i < visibleFood.Count; i++)
            {
                var food = visibleFood[i];
                string foodKey = $"food_{food.x:F2}_{food.y:F2}";

                if (!foodObjects.ContainsKey(foodKey))
                {
                    GameObject newFood = Instantiate(foodPrefab, new Vector3(food.x, food.y, 0), Quaternion.identity);
                    FoodCell foodComponent = newFood.GetComponent<FoodCell>();
                    if (foodComponent != null && ColorUtility.TryParseHtmlString(food.color, out Color foodColor))
                    {
                        foodComponent.UpdateFood(food.x, food.y, food.radius, foodColor);
                        foodObjects[foodKey] = newFood;
                    }
                    else
                    {
                        Debug.LogError($"FoodCell component not found or invalid color on {newFood.name}");
                    }
                }
                existingFoodKeys.Remove(foodKey);
            }
        }

        // Remove eaten food
        foreach (var key in existingFoodKeys)
        {
            Destroy(foodObjects[key]);
            foodObjects.Remove(key);
        }

        // Handle players
        if (visiblePlayers != null)
        {
            foreach (var player in visiblePlayers)
            {
                for (int i = 0; i < player.cells.Count; i++)
                {
                    var cell = player.cells[i];
                    string cellKey = $"{player.id}_{i}";

                    //if (ColorUtility.TryParseHtmlString(cell.color, out Color cellColor))
                    {
                        GameObject newCell = Instantiate(playerCellPrefab, new Vector3(cell.x, cell.y, 0), Quaternion.identity);
                        PlayerCell cellComponent = newCell.GetComponent<PlayerCell>();
                        if (cellComponent != null)
                        {
                            cellComponent.Initialize(canvas);
                            cellComponent.UpdateCell(cell.x, cell.y, cell.radius, new Color(61f / 255f, 120f / 255f, 221f / 255f), player.nickname);
                            Debug.Log($"Spawning player cell for {player.nickname} at ({cell.x}, {cell.y}) with radius {cell.radius}");
                            playerCellObjects[cellKey] = newCell;
                        }
                        else
                        {
                            Debug.LogError($"PlayerCell component not found on {newCell.name}");
                        }
                    }
                }

                // Update score
                if (player.id == playerId.ToString())
                {
                    scoreText.text = $"Score: {player.score}";
                }

                if (player.id == playerId.ToString() && !isDead)
                {
                    currentScore = player.score;
                    scoreTextMenu.text = $"Score: {currentScore}";
                    var abilities = player.abilities;
                    speedPoints = abilities != null ? abilities.speed : 0f;
                    UpdateSpeedBar();
                }
            }

            // Update camera for local player
            var localPlayer = visiblePlayers.Find(p => p.id == playerId.ToString());
            if (localPlayer != null)
            {
                Vector2 center = Vector2.zero;
                float totalRadius = 0f;
                foreach (var cell in localPlayer.cells)
                {
                    center += new Vector2(cell.x, cell.y) * cell.radius;
                    totalRadius += cell.radius;
                }
                if (totalRadius > 0)
                {
                    center /= totalRadius;
                    Debug.Log($"Calling UpdateCamera with center: {center}, totalRadius: {totalRadius}");
                    cameraController.UpdateCamera(center, totalRadius);
                }
                else
                {
                    Debug.LogWarning("Total radius is 0, cannot update camera.");
                }
            }
            else
            {
                Debug.LogWarning("Local player not found in visiblePlayers.");
            }
        }
    }

    private void HandleLeaderboard(JObject data)
    {
        foreach (Transform child in leaderboardContent)
        {
            if (child.tag != "LeaderboardTitle")
            {
                Destroy(child.gameObject);
            }
        }

        var sortedPlayers = data["topPlayers"]?.ToObject<List<PlayerData>>();
        if (sortedPlayers == null) return;

        int personalRank = data["personal"]?["rank"]?.ToObject<int>() ?? -1;
        int displayCount = Math.Min(10, sortedPlayers.Count);

        for (int i = 0; i < displayCount; i++)
        {
            var player = sortedPlayers[i];
            GameObject entry = new GameObject($"PlayerEntry_{i}");
            entry.transform.SetParent(leaderboardContent, false);
            TextMeshProUGUI text = entry.AddComponent<TextMeshProUGUI>();
            text.text = $"{player.nickname}: {Mathf.FloorToInt(player.score)}";
            text.margin = new Vector4(20, 10, 0, 0);
            text.alignment = TextAlignmentOptions.TopLeft;
            text.fontSize = 20;
            text.color = i == personalRank - 1 ? new Color(0.24f, 0.85f, 0.51f) : Color.white;

            if (personalRank > sortedPlayers.Count && player.id == playerId.ToString())
            {
                text.color = new Color(0.24f, 0.85f, 0.51f);
                text.text = $"{player.nickname}: {Mathf.FloorToInt(player.score)} (Rank: {personalRank})";
            }
        }
    }

    private void UpdateSpeedBar()
    {
        float maxSpeed = 5f;
        float fillAmount = Mathf.Clamp01(speedPoints / maxSpeed);
        speedBarFill.fillAmount = fillAmount;
    }

    private void CopyRoomIdToClipboard()
    {
        GUIUtility.systemCopyBuffer = roomId;
        Debug.Log("Room ID copied to clipboard: " + roomId);
    }

    private async void OnApplicationQuit()
    {
        SendLeave();
        await Task.Delay(100); 
        await websocket.Close();
    }

    private void ShowGameOverScreen()
    {
        if (gameOverCanvas != null)
        {
            gameOverCanvas.gameObject.SetActive(true);
        }
    }

    public void OnPlayAgainClicked()
    {
        if (websocket != null && websocket.State == WebSocketState.Open)
        {
            SendLeave();
            ClearGameObjects();
        }
        SendJoin();
        isDead = false;
        if (gameOverCanvas != null)
        {
            gameOverCanvas.gameObject.SetActive(false);
        }
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }

    public void OnBackToMenuClicked()
    {
        if (websocket != null && websocket.State == WebSocketState.Open)
        {
            SendLeave();
            ClearGameObjects();
        }
        SceneManager.LoadScene("MenuScene");
    }

    private void ClearGameObjects()
    {
        foreach (var food in foodObjects.Values)
        {
            Destroy(food);
        }
        foodObjects.Clear();

        foreach (var cell in playerCellObjects.Values)
        {
            Destroy(cell);
        }
        playerCellObjects.Clear();
    }

    [Serializable]
    private class FoodData
    {
        public float x;
        public float y;
        public float radius;
        public string color;
    }

    [Serializable]
    private class CellData
    {
        public float x;
        public float y;
        public float radius;
        public string color;
    }

    [Serializable]
    private class PlayerData
    {
        public string id;
        public string nickname;
        public int score;
        public List<CellData> cells;
        public Abilities abilities;
    }

    [Serializable]
    private class Abilities
    {
        public float speed;
    }
}