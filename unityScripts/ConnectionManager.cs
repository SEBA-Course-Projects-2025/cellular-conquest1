﻿using UnityEngine;
using NativeWebSocket;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using TMPro;
using UnityEngine.SceneManagement;

public class WebSocketClient : MonoBehaviour
{
    private WebSocket websocket;
    private Guid playerId;
    private string nickname = "UnityPlayer";

    private Vector2 currentDirection = Vector2.zero;
    private bool isDead = false;

    public GameObject foodPrefab;
    public GameObject playerCellPrefab;

    public Canvas canvas;
    public TextMeshProUGUI scoreText;
    public Transform leaderboardContent;
    public Canvas gameOverCanvas;

    private RectTransform canvasRect;
    private Vector2 canvasCenter;

    // lists of instantiated
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
        if (foodPrefab == null || playerCellPrefab == null || canvas == null)
        {
            Debug.LogError("Food, PlayerCell prefab, or Canvas not assigned!");
            return;
        }

        //websocket = new WebSocket("ws://localhost:8080/");
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
            Debug.Log("Trying to connect to ws://localhost:8080/");
        }
        catch (Exception ex)
        {
            Debug.LogError("Connection failed: " + ex.Message);
        }
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        websocket?.DispatchMessageQueue();
#endif

        //handling input 
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
    }


    private void SendJoin()
    {
        var joinPayload = new
        {
            type = "join",
            nickname = nickname
        };
        SendMessage(joinPayload);
    }

    private void SendInput(Vector2 direction)
    {
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
        var splitPayload = new
        {
            type = "split"
        };
        SendMessage(splitPayload);
    }
    
    private void SendSpeedup()
    {
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
                Debug.Log($"Joined game as {obj["nickname"]}, ID: {playerId}");
                break;

            case "gameState":
                HandleGameState(obj);
                break;

            case "death":
                int score = obj["score"]?.ToObject<int>() ?? 0;
                Debug.Log($"You died. Final Score: {score}");
                isDead = true;
                ShowGameOverScreen();
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

        var existingFoodKeys = new HashSet<string>(foodObjects.Keys);
        var existingCellKeys = new HashSet<string>(playerCellObjects.Keys);

        // canvas dimentions into pixels
        Vector2 canvasSize = canvasRect.sizeDelta;
        float canvasWidth = canvasSize.x;
        float canvasHeight = canvasSize.y;

        // add new food
        if (visibleFood != null)
        {
            for (int i = 0; i < visibleFood.Count; i++)
            {
                var food = visibleFood[i];
                // using x and y as key
                string foodKey = $"food_{food.x:F2}_{food.y:F2}";

                if (!foodObjects.ContainsKey(foodKey))
                {
                    GameObject newFood = Instantiate(foodPrefab, canvas.transform);
                    FoodCell foodComponent = newFood.GetComponent<FoodCell>();
                    foodComponent.SetPositionAndRadius(MapWorldToCanvas(food.x, food.y, canvasWidth, canvasHeight), food.radius, food.color);
                    foodObjects[foodKey] = newFood;
                }
                existingFoodKeys.Remove(foodKey); // later i destroy objects from this list, so i delete it from here if the food should stay
            }
        }
        
        // delete eaten
        foreach (var key in existingFoodKeys)
        {
            Destroy(foodObjects[key]);
            foodObjects.Remove(key);
        }

        // update and create player cells
        if (visiblePlayers != null)
        {
            foreach (var player in visiblePlayers)
            {
                for (int i = 0; i < player.cells.Count; i++)
                {
                    var cell = player.cells[i];
                    string cellKey = $"{player.id}_{i}";

                    if (playerCellObjects.TryGetValue(cellKey, out GameObject cellObj))
                    {
                        PlayerCell cellComponent = cellObj.GetComponent<PlayerCell>();
                        cellComponent.SetPositionAndRadius(MapWorldToCanvas(cell.x, cell.y, canvasWidth, canvasHeight), cell.radius, cell.color, player.nickname);
                        existingCellKeys.Remove(cellKey); // remove if want to keep this cell, cause this list will be destroyed
                    }
                    else //spawn newly added
                    {
                        GameObject newCell = Instantiate(playerCellPrefab, canvas.transform);
                        PlayerCell cellComponent = newCell.GetComponent<PlayerCell>();
                        cellComponent.SetPositionAndRadius(MapWorldToCanvas(cell.x, cell.y, canvasWidth, canvasHeight), cell.radius, cell.color, player.nickname);
                        playerCellObjects[cellKey] = newCell;
                    }
                }
                // update score
                if (player.id == playerId.ToString())
                {
                    scoreText.text = $"Score: {player.score}";
                }
            }
        }
        //deleting players that are no longer in gamestate
        foreach (var key in existingCellKeys)
        {
            Destroy(playerCellObjects[key]);
            playerCellObjects.Remove(key);
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
        var currentPlayer = sortedPlayers.Find(p => p.id == playerId.ToString());
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


    //handling dimentions
    private Vector2 MapWorldToCanvas(float worldX, float worldY, float canvasWidth, float canvasHeight)
    {
        float canvasX = (worldX / 2000f) * canvasWidth;
        float canvasY = (worldY / 2000f) * canvasHeight;
        canvasX -= canvasWidth * 0.5f;
        canvasY -= canvasHeight * 0.5f;
        return new Vector2(canvasX, canvasY);
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
    }
}