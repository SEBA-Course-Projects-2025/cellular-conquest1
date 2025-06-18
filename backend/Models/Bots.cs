using System;
using System.Numerics;
using System.Collections.Generic;

public class Bot: Player
{
    private static Random rng = new();
    public int AntibodyHits { get; set; } = 0;
    public int MaxAntibodyHits { get; set; } = 5;
    public Bot(string name, Guid roomId)
    {
        Id = Guid.NewGuid();
        Nickname = name;
        RoomId = roomId;
        IsBot = true;
        Cells = new List<Cell> {
            new Cell {
                Position = new Vector2(
                    rng.Next(0, Game.WorldWidth),
                    rng.Next(0, Game.WorldHeight)
                ),
                Radius = 45f
            }
        };
    }
    
    public void UpdateAI(Player targetPlayer)
    {
        if (targetPlayer == null || targetPlayer.Cells.Count == 0 || this.Cells.Count == 0)
            return;

        var botCell = this.Cells[0];
        var targetCell = targetPlayer.Cells[0];
        Vector2 toTarget = Vector2.Normalize(targetCell.Position - botCell.Position);

        if (!float.IsNaN(toTarget.X) && !float.IsNaN(toTarget.Y))
            this.Direction = toTarget;
    }
}