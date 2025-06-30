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


public partial class Game
{
    private Cell GetBiggestCell(Player player) {
        return player.Cells.OrderByDescending(cell => cell.Radius).First();
    }

    private async Task HandleConnection(HttpListenerContext context) {
        WebSocket webSocket = (await context.AcceptWebSocketAsync(null)).WebSocket;
        Console.WriteLine("New connection");

        Player? player = null;
        Random random = new Random();

        byte[] buffer = new byte[Config.BufferSize];
        while (webSocket.State == WebSocketState.Open)
        {
            try
            {
                var ms = new MemoryStream();
                WebSocketReceiveResult result;
                do
                {
                   result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                   ms.Write(buffer, 0, result.Count);
                } while (!result.EndOfMessage);

                if (result.MessageType == WebSocketMessageType.Close)
                    break;

                ms.Seek(0, SeekOrigin.Begin);
                var json = Encoding.UTF8.GetString(ms.ToArray());
                var obj = JsonNode.Parse(json);
                string? type = obj?["type"]?.ToString();

                switch (type)
                {
                    case "join":
                        string? roomIdStr = obj?["roomId"]?.ToString();
                        string? privateServer = obj?["privateServer"]?.ToString();
                        bool isDeathMatch =
                            (obj?["deathMatch"]?.GetValue<bool>() ?? false)
                            || (obj?["mode"]?.ToString()?.ToLower() == "deathmatch");
                        string? customSkin = obj?["customSkin"]?.ToString();
                        
                        Guid roomId;
                        if (isDeathMatch) {
                            roomId = Guid.NewGuid();
                        }
                        else if (!string.IsNullOrWhiteSpace(privateServer))
                        {
                            if (privateServer == "true")
                            {
                                roomId = Guid.NewGuid();
                            }
                            else if (Guid.TryParse(privateServer, out var parsedGuid))
                            {
                                roomId = parsedGuid;
                            }
                            else
                            {
                                roomId = PublicRoomId;
                            }
                        }
                        else if (!string.IsNullOrWhiteSpace(roomIdStr) && Guid.TryParse(roomIdStr, out var joinGuid))
                        {
                            roomId = joinGuid;
                        }
                        else
                        {
                            roomId = PublicRoomId;
                        }
						var roomPlayers = rooms.GetOrAdd(roomId, _ => new ConcurrentDictionary<Guid, Player>());

						if (isDeathMatch) {
        					int botCount = Config.NumBots;
        					var bots = new List<Bot>();
        					for (int i = 0; i < botCount; i++) {
            					var bot = new Bot($"Bot {i+1}", roomId);
            					roomPlayers[bot.Id] = bot;
            					bots.Add(bot);
        					}
        					roomBots[roomId] = bots;
    					}

                        player = new Player
                        {
                            Id = Guid.NewGuid(),
                            Nickname = obj?["nickname"]?.ToString() ?? "Anonymous",
                            Socket = webSocket,
                            RoomId = roomId,
                            CustomSkin = customSkin,
                            Cells = new List<Cell>
                            {
                                new Cell
                                {
                                    Position =  FindSafeSpawnPosition(roomId),
                                }
                            }
                        };

                        Console.WriteLine($"[{player.Nickname}] Mode is {obj?["mode"]?.ToString()}");

                        roomPlayers[player.Id] = player;
                        
                        if (!string.IsNullOrEmpty(customSkin))
                        {
                            var skinMsg = new {
                                type = "customSkinBroadcast",
                                id = player.Id,
                                image = customSkin
                            };

                            foreach (var p in roomPlayers.Values)
                            {
                                await SendJson(p, skinMsg);
                            }
                        }

                        if (!roomFood.ContainsKey(roomId))
                        {
                            SpawnFood(roomId, 100);
                        }
                        
                        var joinResponse = new
                        {
                            type = "playerData",
                            id = player.Id,
                            nickname = player.Nickname,
                            width = Config.WorldWidth,
                            height = Config.WorldHeight,
                            roomId = roomId,
                            currentImages = roomPlayers.Values
                                .Where(p => !string.IsNullOrEmpty(p.CustomSkin))
                                .Select(p => new { id = p.Id, image = p.CustomSkin })
                                .ToList()
                        };
                        await SendJson(player, joinResponse);

                        break;
                

                    case "input":
                        if (player != null)
                        {
                            float x = obj?["direction"]?["x"]?.GetValue<float>() ?? 0f;
                            float y = obj?["direction"]?["y"]?.GetValue<float>() ?? 0f;
                            player.Direction = new Vector2(x, y);
                        }
                        break;

                    case "split":
                        if (player != null && player.Cells.Count < 16)
                        {
                            Console.WriteLine($"[{player.Nickname}] Split activated");
                            var newCells = new List<Cell>();
                            foreach (var cell in player.Cells)
                            {
                                if (cell.Radius > Config.MinCellRadius && player.Cells.Count + newCells.Count < Config.MaxCellCount) 
                                {
                                    var splitRadius = cell.Radius / Config.SplitRadius; 
                                    var direction = Vector2.Normalize(player.Direction == Vector2.Zero ? new Vector2(1, 0) : player.Direction);
                                    var offset = direction * (splitRadius + Config.CellOffset);
                                    var newPos = cell.Position + offset;

                                    if (newPos.X < 0 || newPos.X > Config.WorldWidth){
                                        direction.X *= -1;
                                        offset = direction * (splitRadius + Config.CellOffset);
                                        newPos = cell.Position + offset;
                                    }
                                        
                                    if (newPos.Y < 0 || newPos.Y > Config.WorldHeight){
                                        direction.Y *= -1;
                                        offset = direction * (splitRadius + Config.CellOffset);
                                        newPos = cell.Position + offset;
                                    }

                                    newCells.Add(new Cell
                                    {
                                        Position = newPos,
                                        Radius = splitRadius,
                                        Velocity = direction * Config.CellDirection 
                                    });

                                    cell.Radius = splitRadius;

                                    if (player.Cells.Count + newCells.Count >= Config.MaxCellCount) break;
                                }
                            }
                            player.Cells.AddRange(newCells);
                        }
                        break;

                    case "speedup":
                        if (player != null) {
                            if (player.SpeedBoostPoints > 0 )
                            {
                                player.SpeedBoostUntil = DateTime.UtcNow.AddSeconds(Config.SpeedSeconds);
                                player.SpeedBoostPoints--;
                            }
                            Console.WriteLine($"[{player.Nickname}] Speed boost activated. Points: {player.SpeedBoostPoints}");
                        }
                        break;
                        
                    case "feed":
                        if (player != null && player.Cells.Count() > 0) {
                            var now = DateTime.UtcNow;
                            if ((now - player.LastFeedTime).TotalSeconds < Config.FeedDelay) {
                                Console.WriteLine($"[{player.Nickname}] Tried to feed too soon.");
                                break;
                            }
                            player.LastFeedTime = now;
                            Console.WriteLine($"[{player.Nickname}] Feed activated.");
                            var bigCell = GetBiggestCell(player);
                            if (bigCell.Radius >= 11f) {
                                float antiRadius = bigCell.Radius * 0.1f;
                                bigCell.Radius *= Config.FeedSizeDecreaze;

                                Vector2 direction = Vector2.Normalize(player.Direction == Vector2.Zero ? new Vector2(1, 0) : player.Direction);
                                Vector2 offset = direction * (bigCell.Radius + antiRadius + Config.AntiOffset); 
                                Vector2 spawnPos = bigCell.Position + offset;

                                if (spawnPos.X < 0 || spawnPos.X > Config.WorldWidth){
                                    direction.X *= -1;
                                    offset = direction * (antiRadius + Config.AntiOffset);
                                    spawnPos = bigCell.Position + offset;
                                }
                                    
                                if (spawnPos.Y < 0 || spawnPos.Y > Config.WorldHeight){
                                    direction.Y *= -1;
                                    offset = direction * (antiRadius + Config.AntiOffset);
                                    spawnPos = bigCell.Position + offset;
                                }


                                var newAntibody = new AntiBody {
                                    Position = spawnPos,
                                    Velocity = direction * Config.AntiVelocityInit,
                                    Radius = antiRadius,
                                    CreatedAt = DateTime.UtcNow
                                };

                                var roomAntiList = antibodys.GetOrAdd(player.RoomId, _ => new List<AntiBody>());
                                lock (roomAntiList)
                                {
                                    roomAntiList.Add(newAntibody);
                                }
                            } 
                        }
                        break;

                    case "leave":
                        if (player != null)
                        {
                            Console.WriteLine($"[{player.Nickname}] Disconnected.");
                            ConcurrentDictionary<Guid, Player>? roomPlayers1;
                            
                            if (!rooms.TryGetValue(player.RoomId, out roomPlayers1))
                            {
                                roomPlayers1 = rooms.GetOrAdd(player.RoomId, _ => new ConcurrentDictionary<Guid, Player>());
                            }

                            roomPlayers1.TryRemove(player.Id, out _);

                            if (roomPlayers1.IsEmpty && player.RoomId != PublicRoomId)
                            {
                                rooms.TryRemove(player.RoomId, out _);
                            }
                        }

                        await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Player left", CancellationToken.None);
                        return;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
                break;
            }
        }
        if (player != null && rooms.TryGetValue(player.RoomId, out var disconnectRoom))
        {
            disconnectRoom.TryRemove(player.Id, out _);
            if (disconnectRoom.IsEmpty && player.RoomId != PublicRoomId)
                rooms.TryRemove(player.RoomId, out _);

            Console.WriteLine($"[{player?.Nickname}] Disconnected.");
        }
    }
}