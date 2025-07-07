// Config.cs
using SixLabors.ImageSharp.PixelFormats;

namespace GameConfig {
    public static class Config {
        public const int WorldWidth = 2000;
        public const int WorldHeight = 2000;
        public const float MinPlayerDistance = 100f;
 		public const float MinBotDistance = 150f;
        public const float MinBushDistance = 100f;   
        public const float Margin = 100f;    
		public const float MinBotDistanceToPlayer = 150f;

        public const string FoodColor = "#3dda83";
        public const string BoostColor = "#00cfff";
        public const string SlimeColor = "#2d6d51";
        public const string BotColor = "#ffe600";

        public const float PlayerSpeed = 350f;
        public const float PlayerHighSpeed = 500f;
        public const float BotSpeed = 180f;

        public const float CellVelocity = 0.9f;
        public const float AntiVelocityMove = 0.9f;
        public const float AntiVelocityInit = 1500f;

        public const float PointPerFood = 10f;
        public const float PointPerCell = 35f;

        public const float OneCellAreaToKill = 1.1f;
        public const float ManyCellAreaToKill = 1.35f;
        public const float SlimeAdreToKill = 1.1f;

        public const int SpeedSeconds = 5;
        public const int MaxSpeedPoints = 5;

        public const int SecForAnti = 10;

        public const float SizeFactor = 15f;

        public const int SpawnNumFood = 100;
        public const int MinSpawnNumSlimes = 3;
        public const int MaxSpawnNumSlimes = 9;
        public const int NumBots = 5;

        public const float PosSpeedBonus = 0.1f;
        public const float FoodRadius = 5f;
        public const float SpeedBonusRadius = 9f;
        public const float CellRadius = 20f;
        public const float BotRadius = 45f;
        public const int MinSlimeRadius = 60;
        public const int MaxSlimeRadius = 150;

        public const int BufferSize = 4096;

        public const float MinCellRadius = 10f;
        public const float SplitRadius = 1.414f;
        public const int CellOffset = 90;
        public const int CellDirection = 200;
        public const int MaxCellCount = 4;

        public const int AntiOffset = 5;

        public const float FeedSizeDecreaze = 0.9f;

        public const int MaxAntiHits = 5;

        public const float FeedDelay = 0.5f;
        
        public const float MaxSplitDistanceFactor = 5.0f; 
        public const float MaxAllowedRadiusSplit = 500f;
        public const float SlowDownDistance = 0.7f;
        public const float MainCellDirectionAngle = 0.7f;

        public static readonly Rgba32 MediumColor = new Rgba32(136, 136, 136); // #888888
        public const float LightenFactor = 0.3f;
    }

}
