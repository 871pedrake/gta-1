using UnityEngine;

/// <summary>
/// Animação leve de superfície da água por deslocamento de UV (UV offset)
/// e reação de cor opcional para dia/noite.
/// </summary>
public class CidadeAguaAnimada : MonoBehaviour
{
    private Material materialAlvo;
    private Vector2 velocidadeUV = new Vector2(0.06f, -0.02f);
    private Color corBase = new Color(0.14f, 0.54f, 0.66f, 0.70f);
    private Vector2 offsetAtual;

    public void Configurar(Material mat, Vector2 velocidade, Color cor)
    {
        materialAlvo = mat;
        velocidadeUV = velocidade;
        corBase = cor;
    }

    private void Update()
    {
        if (materialAlvo == null) return;

        offsetAtual += velocidadeUV * Time.deltaTime;
        offsetAtual.x %= 1f;
        offsetAtual.y %= 1f;

        if (materialAlvo.HasProperty("_BaseMap"))
            materialAlvo.SetTextureOffset("_BaseMap", offsetAtual);
        if (materialAlvo.HasProperty("_MainTex"))
            materialAlvo.SetTextureOffset("_MainTex", offsetAtual);
        if (materialAlvo.HasProperty("_BaseColorMap"))
            materialAlvo.SetTextureOffset("_BaseColorMap", offsetAtual);
    }

    public void AplicarFatorDiaNoite(float fatorDia)
    {
        if (materialAlvo == null) return;
        float mult = Mathf.Lerp(0.28f, 1.0f, Mathf.Clamp01(fatorDia));
        Color c = new Color(corBase.r * mult, corBase.g * mult, corBase.b * mult, corBase.a);
        if (materialAlvo.HasProperty("_BaseColor")) materialAlvo.SetColor("_BaseColor", c);
        if (materialAlvo.HasProperty("_Color")) materialAlvo.SetColor("_Color", c);
    }
}