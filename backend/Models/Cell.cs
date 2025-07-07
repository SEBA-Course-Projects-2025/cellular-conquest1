using System.Numerics;          
using System.Net.WebSockets;  
using GameConfig;


public class Cell
{
    public Vector2 Position { get; set; }
    public float Radius { get; set; } = Config.CellRadius;
    public Vector2 Velocity { get; set; } = Vector2.Zero;
    public List<int> Bush_IDs { get; set; } = new List<int>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

}