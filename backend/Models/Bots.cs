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
    
    public void UpdateAI(Player targetPlayer, List<Bot> allBotsInRoom)
    {
        if (targetPlayer == null || targetPlayer.Cells.Count == 0 || this.Cells.Count == 0)
            return;

        var botCell = this.Cells[0];
        var targetCell = targetPlayer.Cells[0];

        Vector2 toTarget = targetCell.Position - botCell.Position;
        float distance = toTarget.Length();
        
        Vector2 predictedPos = targetCell.Position + targetPlayer.Direction * 50f;

        Vector2 desiredDirection = Vector2.Normalize(predictedPos - botCell.Position);
        
        if (float.IsNaN(desiredDirection.X) || float.IsNaN(desiredDirection.Y))
            return;
        
        Vector2 separation = Vector2.Zero;
        foreach (var otherBot in allBotsInRoom)
        {
            if (otherBot == this) continue;

            Vector2 offset = botCell.Position - otherBot.Cells[0].Position;
            float dist = offset.Length();
            if (dist < 100f && dist > 1f)
            {
                separation += Vector2.Normalize(offset) / dist; 
            }
        }
        
        if (distance > 300f) { }
        else if (distance > 100f)
        {
            Vector2 perpendicular = new Vector2(-desiredDirection.Y, desiredDirection.X);
            desiredDirection += perpendicular * 0.5f;
        }
        else
        {
            Vector2 perpendicular = new Vector2(-desiredDirection.Y, desiredDirection.X);
            desiredDirection += perpendicular;
        }
        
        desiredDirection += separation * 2f;
        
        desiredDirection += new Vector2(
            (float)(rng.NextDouble() - 0.5) * 0.1f,
            (float)(rng.NextDouble() - 0.5) * 0.1f
        );

        desiredDirection = Vector2.Normalize(desiredDirection);

        float turnSpeed = 0.1f;
        this.Direction = Vector2.Lerp(this.Direction, desiredDirection, turnSpeed);
    }
}