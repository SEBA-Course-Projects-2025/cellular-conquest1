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
            if (!roomSlimes.TryGetValue(roomId, out var slimeItems))
                slimeItems = new List<Slime>();

            
            var now = DateTime.UtcNow;
            antibodyItems.RemoveAll(a => (now - a.CreatedAt).TotalSeconds > Config.SecForAnti);
            
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
                var mainCell = GetBiggestCell(player);

                foreach (var cell in player.Cells)
                {
                    float baseSpeed = player.HasSpeedBoost ? Config.PlayerHighSpeed : (player.IsBot ? Config.BotSpeed : Config.PlayerSpeed);
                    float sizeFactor = cell.Radius / Config.SizeFactor;
                    float naturalSpeed = baseSpeed / sizeFactor;

                    Vector2 dir = Vector2.Normalize(player.Direction);
                    if (float.IsNaN(dir.X) || float.IsNaN(dir.Y)) dir = Vector2.Zero;

                    float speed = naturalSpeed;

                    if (cell != mainCell)
                    {
                        float distance = Vector2.Distance(cell.Position, mainCell.Position);
                        float maxDistance = Config.MaxAllowedRadiusSplit;

                        if (distance > Config.SlowDownDistance * maxDistance)
                        {
                            Vector2 toMain = Vector2.Normalize(mainCell.Position - cell.Position);
                            float directionDot = Vector2.Dot(dir, toMain); // if direction to main cell -> natural speed

                            if (directionDot < Config.MainCellDirectionAngle) 
                            {
                                float factor = 1f - ((distance - 0.5f * maxDistance) / (0.5f * maxDistance));
                                factor = MathF.Max(0.1f, factor);
                                speed *= factor;
                            }
                        }
                    }

                    cell.Velocity = dir * speed;
                    cell.Position += cell.Velocity * deltaTime;
                    cell.Position = Vector2.Clamp(cell.Position, Vector2.Zero, new Vector2(Config.WorldWidth, Config.WorldHeight));
                    cell.Velocity *= Config.CellVelocity;

                    cell.Bush_ID = null;
                    foreach (var slime in slimeItems)
                    {
                        float dist = Vector2.Distance(cell.Position, slime.Position);
                        if (dist <= slime.Radius)
                        {
                            cell.Bush_ID = slime.ID;
                        }
                    }
                }
            }

            // move antibodys
            foreach (var antibody in antibodyItems)
            {
                antibody.Position += antibody.Velocity * deltaTime;
                antibody.Position = Vector2.Clamp(antibody.Position, Vector2.Zero, new Vector2(Config.WorldWidth, Config.WorldHeight));
                antibody.Velocity *= Config.AntiVelocityMove; 

                antibody.Bush_ID = null;
                foreach (var slime in slimeItems) {
                    float dist = Vector2.Distance(antibody.Position, slime.Position);
                    if (dist <= slime.Radius) {
                        antibody.Bush_ID = slime.ID;
                    }
                }
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
                        if (Vector2.Distance(cell.Position, food.Position) < cell.Radius && food.Bush_ID == cell.Bush_ID)
                        {
                            eaten.Add(food);

                            float currentArea = MathF.PI * cell.Radius * cell.Radius;
                            float foodArea = MathF.PI * food.Radius * food.Radius;
                            int points = (int)(foodArea / Config.PointPerFood);
                            player.Score += points;
                            float newArea = currentArea + foodArea;
                            cell.Radius = MathF.Sqrt(newArea / MathF.PI);

                            if (food.IsSpeedBoost)
                            {
                                player.SpeedBoostPoints = Math.Min(player.SpeedBoostPoints + 1, Config.MaxSpeedPoints);
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
                            if (Vector2.Distance(cell.Position, anti.Position) < cell.Radius && anti.Bush_ID == cell.Bush_ID)
                            {
                                eatenAnti.Add(anti);

                                float currentArea = MathF.PI * cell.Radius * cell.Radius;
                                float antiArea = MathF.PI * anti.Radius * anti.Radius;
                                int points = (int)(antiArea / Config.PointPerFood);
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
                    SpawnFood(roomId, 1);
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
                    if (hunter.Id == prey.Id) { //merge case
                    var merged = new List<(Cell, Cell)>();

                    for (int i = 0; i < hunter.Cells.Count; i++) {
                        for (int j = i + 1; j < hunter.Cells.Count; j++) {
                            var cellA = hunter.Cells[i];
                            var cellB = hunter.Cells[j];

                            float distance = Vector2.Distance(cellA.Position, cellB.Position);
                            if (distance < Math.Min(cellA.Radius, cellB.Radius) && cellA.Bush_ID == cellB.Bush_ID) {
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
                            if (((hunterCell.Radius > preyCell.Radius * Config.OneCellAreaToKill && distance < hunterCell.Radius &&
                                 hunter.Cells.Count() == 1)
                                || (hunterCell.Radius > preyCell.Radius * Config.ManyCellAreaToKill && distance < hunterCell.Radius &&
                                    hunter.Cells.Count() > 1)) && hunterCell.Bush_ID == preyCell.Bush_ID)
                            {
                                float hunterArea = MathF.PI * hunterCell.Radius * hunterCell.Radius;
                                float preyArea = MathF.PI * preyCell.Radius * preyCell.Radius;
                                float newArea = hunterArea + preyArea;
                                hunterCell.Radius = MathF.Sqrt(newArea / MathF.PI);
                                int points = (int)(preyArea / Config.PointPerCell);
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

            // determine what bush_ids we have
            foreach ( var player in players.Values){
                var antiColor = player.PopularSkinColor;
                var playerBushIds = player.Cells
                    .Select(c => c.Bush_ID)
                    .Where(id => id != null)
                    .Distinct()
                    .ToList();

                //bool playerInBush = playerBushIds.Any();

                var visibleFood = foodItems
                    .Where(f => f.Bush_ID == null || playerBushIds.Contains(f.Bush_ID))
                    .Select(f => new {
                        x = f.Position.X,
                        y = f.Position.Y,
                        radius = f.Radius,
                        color = f.Color
                    })
                    .ToList();

                // add antibodys 
                if (antibodys.TryGetValue(roomId, out var antibodyList)) {
                    visibleFood.AddRange(antibodyList
                        .Where(a => a.Bush_ID == null || playerBushIds.Contains(a.Bush_ID))
                        .Select(a => new {
                            x = a.Position.X,
                            y = a.Position.Y,
                            radius = a.Radius,
                            color = antiColor ?? ""
                        }));
                }

                var visiblePlayersList = players.Values.Select(p => new
                {
                    id = p.Id,
                    nickname = p.Nickname,
                    score = p.Score,
                    boost = p.RemainingBoostSeconds,
                    isBot = p.IsBot,
                    cells = p.Cells
                        .Where(c => c.Bush_ID == null || playerBushIds.Contains(c.Bush_ID))
                        .Select(c => new
                        {
                            x = c.Position.X,
                            y = c.Position.Y,
                            radius = c.Radius,
                            color = p.IsBot ? Config.BotColor : p.PopularSkinColor
                        }).ToList(),
                    abilities = p.SpeedBoostPoints > 0
                        ? new
                        {
                            speed = p.SpeedBoostPoints
                        }
                        : null
                }).Where(p => p.cells.Count > 0).ToList();

            var visibleBushes = slimeItems.Select(b => new
            {
                x = b.Position.X,
                y = b.Position.Y,
                radius = b.Radius,
                color = b.Color,
                id = b.ID
            }).ToList();

                //write gameState
                var gameState = new
                {
                    type = "gameState",
                    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    visiblePlayers = visiblePlayersList,
                    visibleBushes = visibleBushes,
                    visibleFood = visibleFood
                };

                var enrichedGameState = new
                {
                    type = gameState.type,
                    timestamp = gameState.timestamp,
                    visiblePlayers = gameState.visiblePlayers,
                    visibleBushes = gameState.visibleBushes,
                    visibleFood = gameState.visibleFood,
                    playerInfo = new {
                        bushIds = playerBushIds
                    }
                };

                await SendJson(player, enrichedGameState);
            }

        }
    }
}
