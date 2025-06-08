using UnityEngine;
using NativeWebSocket;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using TMPro;

public class WebSocketClient : MonoBehaviour
{
    private WebSocket websocket;
    private Guid playerId;
    private string nickname = "PlayerName";

    private Vector2 currentDirection = Vector2.zero;

    public GameObject foodPrefab;
    public GameObject playerCellPrefab;

    public Canvas canvas;
    public TextMeshProUGUI scoreText;

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

        websocket = new WebSocket("ws://localhost:8080/");

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

        // clear objects before rerendering
        foreach (var foodObj in foodObjects.Values)
        {
            Destroy(foodObj);
        }
        foreach (var cellObj in playerCellObjects.Values)
        {
            Destroy(cellObj);
        }
        foodObjects.Clear();
        playerCellObjects.Clear();

        // canvas dimentions into pixels
        RectTransform canvasRect = canvas.GetComponent<RectTransform>();
        Vector2 canvasSize = canvasRect.sizeDelta;
        float canvasWidth = canvasSize.x;
        float canvasHeight = canvasSize.y;

        // rerender food
        if (visibleFood != null)
        {
            for (int i = 0; i < visibleFood.Count; i++)
            {
                var food = visibleFood[i];
                string foodKey = $"food_{i}";
                GameObject newFood = Instantiate(foodPrefab, canvas.transform);
                FoodCell foodComponent = newFood.GetComponent<FoodCell>();
                foodComponent.SetPositionAndRadius(MapWorldToCanvas(food.x, food.y, canvasWidth, canvasHeight), food.radius, food.color);
                foodObjects[foodKey] = newFood;
            }
        }

        // rerender players
        if (visiblePlayers != null)
        {
            foreach (var player in visiblePlayers)
            {
                for (int i = 0; i < player.cells.Count; i++)
                {
                    var cell = player.cells[i];
                    string cellKey = $"{player.id}_{i}";
                    GameObject newCell = Instantiate(playerCellPrefab, canvas.transform);
                    PlayerCell cellComponent = newCell.GetComponent<PlayerCell>();
                    cellComponent.SetPositionAndRadius(MapWorldToCanvas(cell.x, cell.y, canvasWidth, canvasHeight), cell.radius, cell.color, player.nickname);
                    playerCellObjects[cellKey] = newCell;
                }
                if (player.id == playerId.ToString())
                {
                    scoreText.text = $"Score: {player.score}";
                }
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