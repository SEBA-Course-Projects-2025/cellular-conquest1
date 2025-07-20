using System;
using System.Numerics;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using GameConfig;
using ColorAnalyzer;


public partial class Game
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, Player>> rooms = new();
    private readonly ConcurrentDictionary<Guid, List<Food>> roomFood = new();
    private readonly ConcurrentDictionary<Guid, List<AntiBody>> antibodys = new();
    private readonly ConcurrentDictionary<Guid, List<Bot>> roomBots = new();
    private readonly ConcurrentDictionary<Guid, List<Slime>> roomSlimes = new();

    private readonly Guid PublicRoomId = Guid.Empty; 
    
    private HttpListener httpListener = new();
    private Random rng = new();
    private Timer? gameLoopTimer;
    private Timer? leaderboardTimer;


    public async Task StartServer()
    {
        //httpListener.Prefixes.Add("http://localhost:8080/");
        httpListener.Prefixes.Add("http://+:8080/");
        httpListener.Start();
        Console.WriteLine("Server started on ws://localhost:8080");
        var rng = new Random();
        SpawnSlimes(PublicRoomId,  rng.Next(Config.MinSpawnNumSlimes, Config.MaxSpawnNumSlimes));
        SpawnFood(PublicRoomId, Config.SpawnNumFood);
        

        gameLoopTimer = new Timer(SendGameState, null, 0, 1000 / 60);
        leaderboardTimer = new Timer(async _ => await SendLeaderboardAsync(), null, 0, 1000); // every 1s

        while (true)
        {
            var context = await httpListener.GetContextAsync();
            if (context.Request.IsWebSocketRequest)
                _ = HandleConnection(context);
            else
                context.Response.StatusCode = 400;
        }
    }
   
    private void SpawnFood(Guid roomId, int count) {
        var list = roomFood.GetOrAdd(roomId, _ => new List<Food>());
        if (!roomSlimes.TryGetValue(roomId, out var slimes))
            slimes = new List<Slime>();

        for (int i = 0; i < count; i++) {
            bool isBoost = rng.NextDouble() < Config.PosSpeedBonus;

            var food_pos = new Vector2(rng.Next(0, Config.WorldWidth), rng.Next(0, Config.WorldHeight));
            Guid? bushId = null;
            foreach (var slime in slimes)
            {
                float distance = Vector2.Distance(food_pos, slime.Position);
                if (distance <= slime.Radius)
                {
                    bushId = slime.ID;
                }
            }
            var radius = rng.Next(Config.MinFoodRadius, Config.MaxFoodRadius);
            list.Add(new Food
            {
                Position = food_pos,
                Radius = isBoost ? Config.SpeedBonusRadius : radius,
                Color = isBoost ? Config.BoostColor : Config.FoodColor,
                IsSpeedBoost = isBoost,
                Bush_ID = bushId
            });
        }
    }
    private void SpawnSlimes(Guid roomId, int count) {
        var slimes = roomSlimes.GetOrAdd(roomId, _ => new List<Slime>());
        var rng = new Random();

        for (int i = 0; i < count; i++) {
            int radius = rng.Next(Config.MinSlimeRadius, Config.MaxSlimeRadius);
            float x = rng.Next((int)radius, Config.WorldWidth - (int)radius);
            float y = rng.Next((int)radius, Config.WorldHeight - (int)radius);
            var slime = new Slime {
                Radius = radius,
                Position = new Vector2(x, y),
                ID = Guid.NewGuid()
            };
            slimes.Add(slime);
        }
    }

    private Vector2 FindSafeSpawnPosition(Guid roomId, int maxAttempts = 1000)
    {  

        float minX = Config.Margin;
        float maxX = Config.WorldWidth - Config.Margin;
        float minY = Config.Margin;
        float maxY = Config.WorldHeight - Config.Margin;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            Vector2 position = new Vector2(
                (float)(rng.NextDouble() * (maxX - minX) + minX),
                (float)(rng.NextDouble() * (maxY - minY) + minY)
            );

            if (rooms.TryGetValue(roomId, out var roomPlayers))
            {
                bool tooCloseToPlayer = roomPlayers.Values
                    .Any(p => p.Cells.Any(c => Vector2.Distance(position, c.Position) < Config.MinPlayerDistance));
                if (tooCloseToPlayer) continue;
            }

            if (roomSlimes.TryGetValue(roomId, out var slimes))
            {
                bool tooCloseToBush = slimes
                    .Any(b => Vector2.Distance(position, b.Position) < b.Radius + Config.MinBushDistance);
                if (tooCloseToBush) continue;
            }

			if (roomBots.TryGetValue(roomId, out var bots))
        	{
            	bool tooCloseToBot = bots
					.Any(b => Vector2.Distance(position, b.Cells[0].Position) < Config.MinBotDistanceToPlayer);
            	if (tooCloseToBot) continue;
        	}

            return position;
        }

        return new Vector2(Config.WorldWidth / 2, Config.WorldHeight / 2); //no safe place => center
    }


    private async Task SendLeaderboardAsync()
    {
        foreach (var roomEntry in rooms)
        {
            var roomPlayers = roomEntry.Value;
            var playersList = roomPlayers.Values.ToList();
            
            var topPlayers = playersList
				.Where(p => !p.IsBot) 
                .OrderByDescending(p => p.Score)
                .Take(10)
                .Select(p => new {
                    nickname = p.Nickname,
                    score = p.Score
                }).ToList();

            foreach (var player in playersList)
            {
                if (player.Socket?.State != WebSocketState.Open)
                    continue;

                int rank = playersList
					.Where(p => !p.IsBot)
                    .OrderByDescending(p => p.Score)
                    .ToList()
                    .FindIndex(p => p.Id == player.Id) + 1;

                var leaderboard = new
                {
                    type = "leaderboard",
                    topPlayers = topPlayers,
                    personal = new
                    {
                        rank = rank,
                        score = player.Score,
						killed = player.kills 
                    }
                };

                try
                {
                    await SendJson(player, leaderboard);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error sending leaderboard to {player.Nickname}: {ex.Message}");
                }
            }
        }
    }
    private void CleanUpEmptyRooms()
    {
        var roomsToRemove = rooms.Where(kvp => 
            kvp.Key != PublicRoomId && 
            kvp.Value.IsEmpty).Select(kvp => kvp.Key).ToList();

        foreach (var roomId in roomsToRemove)
        {
            rooms.TryRemove(roomId, out _);
            roomFood.TryRemove(roomId, out _);
        }
    }


    private async Task SendJson(Player player, object data) {
        var json = JsonSerializer.Serialize(data);
        var buffer = Encoding.UTF8.GetBytes(json);

        await player.SendLock.WaitAsync();
        try {
            if (player.Socket != null && player.Socket.State == WebSocketState.Open) {
                await player.Socket.SendAsync(buffer, WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
        finally {
            player.SendLock?.Release();
        }
    }
}