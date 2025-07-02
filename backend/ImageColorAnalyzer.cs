using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Xml.Linq;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Advanced;

namespace ColorAnalyzer
{
    public static class ImageColorAnalyzer
    {
        public static string? GetMostPopularColorFromDataUrl(string dataUrl)
        {
            if (dataUrl.StartsWith("data:image/svg+xml,", StringComparison.OrdinalIgnoreCase))
            {
                return GetMostPopularColorFromSvgDataUrl(dataUrl);
            }
            else if (dataUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                return GetMostPopularColorFromRasterDataUrl(dataUrl);
            }
            return null;
        }

        private static string? GetMostPopularColorFromSvgDataUrl(string dataUrl)
        {
            const string prefix = "data:image/svg+xml,";
            string encodedSvg = dataUrl.Substring(prefix.Length);
            string svgXml = WebUtility.UrlDecode(encodedSvg);
            var doc = XDocument.Parse(svgXml);

            var fills = doc.Descendants()
                        .Attributes("fill")
                        .Select(a => a.Value.ToLowerInvariant())
                        .Where(c => !string.IsNullOrWhiteSpace(c))
                        .ToList();

            if (fills.Count == 0)
                return null;

            var colorCounts = fills.GroupBy(c => c)
                                .Select(g => new { Color = g.Key, Count = g.Count() })
                                .OrderByDescending(x => x.Count);

            return colorCounts.First().Color;
        }

        private static string? GetMostPopularColorFromRasterDataUrl(string dataUrl)
        {
            int base64Start = dataUrl.IndexOf("base64,", StringComparison.OrdinalIgnoreCase);
            if (base64Start < 0)
                return null;

            string base64Data = dataUrl.Substring(base64Start + "base64,".Length);
            byte[] imageBytes = Convert.FromBase64String(base64Data);

            using var image = Image.Load<Rgba32>(imageBytes);

            var colorFrequency = new Dictionary<Rgba32, int>();

            for (int y = 0; y < image.Height; y++)
            {
                for (int x = 0; x < image.Width; x++)
                {
                    Rgba32 pixelColor = image[x, y];
                    if (pixelColor.A == 0) continue;

                    if (colorFrequency.ContainsKey(pixelColor))
                        colorFrequency[pixelColor]++;
                    else
                        colorFrequency[pixelColor] = 1;
                }
            }

            if (colorFrequency.Count == 0)
                return null;

            var mostPopularColor = colorFrequency.OrderByDescending(kv => kv.Value).First().Key;
            return $"#{mostPopularColor.R:X2}{mostPopularColor.G:X2}{mostPopularColor.B:X2}";
        }
    }
}
