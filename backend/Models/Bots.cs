using System;
using System.Numerics;
using System.Collections.Generic;
using GameConfig;


public class Bot: Player
{
    private static Random rng = new();
    public int AntibodyHits { get; set; } = 0;
    public int MaxAntibodyHits { get; set; } = Config.MaxAntiHits;

	private static readonly List<string> AllBotNames = new()
    {
    	"Virus-X", "Ebola", "CellSlicer", "Corona", "Job", "Deadline", "Procrastination", "Bug",
    	"404", "Anxiety", "Amoeba", "Zombirus", "VirusPrime", "Cholera", "Burnout", "Stress"
	};

	private static readonly HashSet<string> UsedNames = new();

	private static string GetUniqueName()
    {
        var availableNames = AllBotNames.Except(UsedNames).ToList();

        if (availableNames.Count == 0)
        {
            UsedNames.Clear();
            availableNames = AllBotNames;
        }

        string name = availableNames[rng.Next(availableNames.Count)];
        UsedNames.Add(name);
        return name;
    }

    public Bot(Guid roomId)
    {
        Id = Guid.NewGuid();
        Nickname = GetUniqueName();
        RoomId = roomId;
        IsBot = true;

        Cells = new List<Cell> {
            new Cell {
                Position = new Vector2(
                    rng.Next(0, Config.WorldWidth),
                    rng.Next(0, Config.WorldHeight)
                ),
                Radius = Config.BotRadius
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