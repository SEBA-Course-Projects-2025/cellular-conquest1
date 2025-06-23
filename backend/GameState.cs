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

public partial class Game {
    private async void SendGameState(object? state)
    {
        foreach (var roomEntry in rooms)
        {
            var roomId = roomEntry.Key;
            var players = roomEntry.Value;

            if (!roomFood.TryGetValue(roomId, out var foodItems))
                continue;
            if (!antibodys.TryGetValue(roomId, out var antibodyItems))
                antibodyItems = new List<AntiBody>();
            
            var now = DateTime.UtcNow;
            antibodyItems.RemoveAll(a => (now - a.CreatedAt).TotalSeconds > 10);
            
            var deltaTime = 1f / 60f;
            var eatenCells = new List<(Player victim, Cell cell)>();
            
            var realPlayer = players.Values.FirstOrDefault(p => !p.IsBot);

            roomBots.TryGetValue(roomId, out var botsList);
            if (botsList != null && realPlayer != null)
            {
                foreach (var bot in botsList)
                {
                    bot.UpdateAI(realPlayer);
                }
            }

            //cell movements
            foreach (var player in players.Values)
            {
                foreach (var cell in player.Cells)
                {
                    float baseSpeed = player.HasSpeedBoost ? 450f : (player.IsBot ? 180f : 300F);
                    float sizeFactor = cell.Radius / 15f;
                    float speed = baseSpeed / sizeFactor;

                    Vector2 dir = Vector2.Normalize(player.Direction);
                    if (float.IsNaN(dir.X) || float.IsNaN(dir.Y)) dir = Vector2.Zero;

                    cell.Velocity = dir * speed;

                    cell.Position += cell.Velocity * deltaTime;
                    cell.Position = Vector2.Clamp(cell.Position, Vector2.Zero, new Vector2(WorldWidth, WorldHeight));
                    cell.Velocity *= 0.9f;
                }
            }

            // move antibodys
            foreach (var antibody in antibodyItems)
            {
                antibody.Position += antibody.Velocity * deltaTime;
                antibody.Position = Vector2.Clamp(antibody.Position, Vector2.Zero, new Vector2(WorldWidth, WorldHeight));
                antibody.Velocity *= 0.9f; 
            }
            


            //eaten food by cells
            foreach (var player in players.Values)
            {
                var eaten = new List<Food>();
                var eatenAnti = new List<AntiBody>();

                foreach (var cell in player.Cells)
                {
                    foreach (var food in foodItems)
                    {
                        if (Vector2.Distance(cell.Position, food.Position) < cell.Radius)
                        {
                            eaten.Add(food);

                            float currentArea = MathF.PI * cell.Radius * cell.Radius;
                            float foodArea = MathF.PI * food.Radius * food.Radius;
                            int points = (int)(foodArea / 10f);
                            player.Score += points;
                            float newArea = currentArea + foodArea;
                            cell.Radius = MathF.Sqrt(newArea / MathF.PI);

                            if (food.IsSpeedBoost)
                            {
                                player.SpeedBoostPoints = Math.Min(player.SpeedBoostPoints + 1, 5);
                                Console.WriteLine($"[{player.Nickname}] Boost is eaten");
                            }

                            break;
                        }
                    }

                    // eat anti
                    foreach (var anti in antibodyItems)
                    {
                        if (player.IsBot)
                        {
                            var botObj = player as Bot;
                            if (botObj != null && Vector2.Distance(cell.Position, anti.Position) < cell.Radius)
                            {
                                eatenAnti.Add(anti);
                                botObj.AntibodyHits++;
                                if (botObj.AntibodyHits >= botObj.MaxAntibodyHits)
                                {
                                    eatenCells.Add((botObj, cell));
                                }
                                break; 
                            }
                        }
                        else
                        {
                            if (Vector2.Distance(cell.Position, anti.Position) < cell.Radius)
                            {
                                eatenAnti.Add(anti);

                                float currentArea = MathF.PI * cell.Radius * cell.Radius;
                                float antiArea = MathF.PI * anti.Radius * anti.Radius;
                                int points = (int)(antiArea / 10f);
                                player.Score += points;
                                float newArea = currentArea + antiArea;
                                cell.Radius = MathF.Sqrt(newArea / MathF.PI);

                                break;
                            }
                        }
                    }
                }

                //remove eaten food, add new
                foreach (var food in eaten)
                {
                    foodItems.Remove(food);

                    bool isBoost = food.IsSpeedBoost;

                    foodItems.Add(new Food
                    {
                        Position = new Vector2(rng.Next(0, WorldWidth), rng.Next(0, WorldHeight)),
                        Radius = isBoost ? 9f : 5f,
                        Color = isBoost ? "#00cfff" : "#3dda83",
                        IsSpeedBoost = isBoost
                    });
                }

                foreach (var anti in eatenAnti) {
                    antibodyItems.Remove(anti);
                }
            }

            //handling cell VS cell
            foreach (var hunter in players.Values)
            {
                foreach (var prey in players.Values)
                {
                    if (hunter.IsBot && prey.IsBot) continue;
                    if (hunter.Id == prey.Id) {
                    var merged = new List<(Cell, Cell)>();

                    for (int i = 0; i < hunter.Cells.Count; i++) {
                        for (int j = i + 1; j < hunter.Cells.Count; j++) {
                            var cellA = hunter.Cells[i];
                            var cellB = hunter.Cells[j];

                            float distance = Vector2.Distance(cellA.Position, cellB.Position);
                            if (distance < Math.Min(cellA.Radius, cellB.Radius)) {
                                merged.Add((cellA, cellB));
                                Console.WriteLine($"[{hunter.Nickname}] Merged.");
                            }
                        }
                    }

                    foreach (var (cellA, cellB) in merged) {
                        if (!hunter.Cells.Contains(cellA) || !hunter.Cells.Contains(cellB)) continue;

                        float areaA = MathF.PI * cellA.Radius * cellA.Radius;
                        float areaB = MathF.PI * cellB.Radius * cellB.Radius;
                        float newArea = areaA + areaB;

                        cellA.Radius = MathF.Sqrt(newArea / MathF.PI);
                        cellA.Position = new Vector2(
                            (cellA.Position.X * areaA + cellB.Position.X * areaB) / newArea,
                            (cellA.Position.Y * areaA + cellB.Position.Y * areaB) / newArea
                        );
                        hunter.Cells.Remove(cellB);
                    }
                } 
                //ordinar atack on another cell
                foreach (var hunterCell in hunter.Cells) {
                    foreach (var preyCell in prey.Cells) {
                            float distance = Vector2.Distance(hunterCell.Position, preyCell.Position);
                            if (prey.IsBot) continue; 
                            if ((hunterCell.Radius > preyCell.Radius * 1.1f && distance < hunterCell.Radius &&
                                 hunter.Cells.Count() == 1)
                                || (hunterCell.Radius > preyCell.Radius * 1.33f && distance < hunterCell.Radius &&
                                    hunter.Cells.Count() > 1))
                            {
                                float hunterArea = MathF.PI * hunterCell.Radius * hunterCell.Radius;
                                float preyArea = MathF.PI * preyCell.Radius * preyCell.Radius;
                                float newArea = hunterArea + preyArea;
                                hunterCell.Radius = MathF.Sqrt(newArea / MathF.PI);
                                int points = (int)(preyArea / 35f);
                                hunter.Score += points;
                                if (prey.Cells.Count() > 1)
                                {
                                    prey.Score = (prey.Score - points) < 0 ? 0 : prey.Score - points;
                                }

                                eatenCells.Add(new ValueTuple<Player, Cell>(prey, preyCell));
                                Console.WriteLine($"[{hunter.Nickname}] Ate [{prey.Nickname}].");
                            }
                        }
                    }
                }
            }

            //check who ate who, remove the pray
            foreach (var (victim, cell) in eatenCells)
            {
                victim.Cells.Remove(cell);


                if (victim.Cells.Count == 0)
                {
                    var deathMessage = new
                    {
                        type = "death",
                        score = victim.Score,
                    };


                    await SendJson(victim, deathMessage);


                    players.TryRemove(victim.Id, out _);
                    Console.WriteLine($"{victim.Nickname} was eaten.");
                    
                    if (victim is Bot botVictim)
                    {
                        // remove bot from roomBots
                        if (roomBots.TryGetValue(roomId, out var botList))
                        {
                            botList.Remove(botVictim);

                            // create and add new bot
                            var newBot = new Bot(botVictim.Nickname, roomId);
                            players[newBot.Id] = newBot;
                            botList.Add(newBot);
                        }
                    }
                }
            }

            var visibleFood = foodItems.Select(f => new {
                x = f.Position.X,
                y = f.Position.Y,
                radius = f.Radius,
                color = f.Color
            }).ToList();

            // add antibodys 
            if (antibodys.TryGetValue(roomId, out var antibodyList)) {
                visibleFood.AddRange(antibodyList.Select(a => new {
                    x = a.Position.X,
                    y = a.Position.Y,
                    radius = a.Radius,
                    color = a.Color
                }));
            }

            var visiblePlayersList = players.Values.Select(p => new
            {
                id = p.Id,
                nickname = p.Nickname,
                score = p.Score,
                boost = p.RemainingBoostSeconds,
                cells = p.Cells.Select(c => new
                {
                    x = c.Position.X,
                    y = c.Position.Y,
                    radius = c.Radius,
                    color = p.IsBot ? "#ffe600" : "#3d78dd"
                }).ToList(),
                abilities = p.SpeedBoostPoints > 0
                    ? new
                    {
                        speed = p.SpeedBoostPoints
                    }
                    : null
            }).ToList();


            //write gameState
            var gameState = new
            {
                type = "gameState",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                visiblePlayers = visiblePlayersList,
                visibleFood = visibleFood
            };


            foreach (var player in players.Values)
            {
                await SendJson(player, gameState);
            }
        }
    }
}
