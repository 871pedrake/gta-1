using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Controla o ciclo sincronizado Verde -> Amarelo -> Vermelho de cada cruzamento
/// usando MaterialPropertyBlock (sem alocar novos materiais e mantendo GPU instancing).
/// </summary>
public class CidadeSemaforoControlador : MonoBehaviour
{
    public enum EstadoLuz { Verde, Amarelo, Vermelho }

    public EstadoLuz EstadoEixoX { get; private set; } = EstadoLuz.Verde;
    public EstadoLuz EstadoEixoZ { get; private set; } = EstadoLuz.Vermelho;

    private readonly List<MeshRenderer> vermX = new List<MeshRenderer>();
    private readonly List<MeshRenderer> amarX = new List<MeshRenderer>();
    private readonly List<MeshRenderer> verdX = new List<MeshRenderer>();
    private readonly List<MeshRenderer> vermZ = new List<MeshRenderer>();
    private readonly List<MeshRenderer> amarZ = new List<MeshRenderer>();
    private readonly List<MeshRenderer> verdZ = new List<MeshRenderer>();

    private float duracaoVerde = 9f;
    private float duracaoAmarelo = 2.2f;
    private float duracaoSeguranca = 1.0f;
    private float tempo;
    private MaterialPropertyBlock mpb;

    private static readonly int IdBaseColor = Shader.PropertyToID("_BaseColor");
    private static readonly int IdColor = Shader.PropertyToID("_Color");
    private static readonly int IdEmissionColor = Shader.PropertyToID("_EmissionColor");
    private static readonly int IdEmissiveColor = Shader.PropertyToID("_EmissiveColor");

    public void Configurar(float verdeSeg, float offsetInicial,
        List<MeshRenderer> rX, List<MeshRenderer> aX, List<MeshRenderer> vX,
        List<MeshRenderer> rZ, List<MeshRenderer> aZ, List<MeshRenderer> vZ)
    {
        duracaoVerde = Mathf.Max(3f, verdeSeg);
        tempo = offsetInicial;
        vermX.AddRange(rX); amarX.AddRange(aX); verdX.AddRange(vX);
        vermZ.AddRange(rZ); amarZ.AddRange(aZ); verdZ.AddRange(vZ);
        mpb = new MaterialPropertyBlock();
        AtualizarLuzes();
    }

    public bool PodePassar(Vector3 direcaoMundo)
    {
        bool eixoX = Mathf.Abs(direcaoMundo.x) >= Mathf.Abs(direcaoMundo.z);
        return eixoX ? EstadoEixoX == EstadoLuz.Verde : EstadoEixoZ == EstadoLuz.Verde;
    }

    private void Update()
    {
        tempo += Time.deltaTime;
        AtualizarLuzes();
    }

    private void AtualizarLuzes()
    {
        if (mpb == null) mpb = new MaterialPropertyBlock();
        float ciclo = (duracaoVerde + duracaoAmarelo + duracaoSeguranca) * 2f;
        float t = Mathf.Repeat(tempo, ciclo);
        float tMetade = duracaoVerde + duracaoAmarelo + duracaoSeguranca;

        if (t < duracaoVerde)
        {
            EstadoEixoX = EstadoLuz.Verde; EstadoEixoZ = EstadoLuz.Vermelho;
        }
        else if (t < duracaoVerde + duracaoAmarelo)
        {
            EstadoEixoX = EstadoLuz.Amarelo; EstadoEixoZ = EstadoLuz.Vermelho;
        }
        else if (t < tMetade)
        {
            EstadoEixoX = EstadoLuz.Vermelho; EstadoEixoZ = EstadoLuz.Vermelho;
        }
        else if (t < tMetade + duracaoVerde)
        {
            EstadoEixoX = EstadoLuz.Vermelho; EstadoEixoZ = EstadoLuz.Verde;
        }
        else if (t < tMetade + duracaoVerde + duracaoAmarelo)
        {
            EstadoEixoX = EstadoLuz.Vermelho; EstadoEixoZ = EstadoLuz.Amarelo;
        }
        else
        {
            EstadoEixoX = EstadoLuz.Vermelho; EstadoEixoZ = EstadoLuz.Vermelho;
        }

        AplicarGrupo(vermX, EstadoEixoX == EstadoLuz.Vermelho, new Color(1f, 0.12f, 0.10f));
        AplicarGrupo(amarX, EstadoEixoX == EstadoLuz.Amarelo, new Color(1f, 0.78f, 0.08f));
        AplicarGrupo(verdX, EstadoEixoX == EstadoLuz.Verde, new Color(0.12f, 0.96f, 0.28f));

        AplicarGrupo(vermZ, EstadoEixoZ == EstadoLuz.Vermelho, new Color(1f, 0.12f, 0.10f));
        AplicarGrupo(amarZ, EstadoEixoZ == EstadoLuz.Amarelo, new Color(1f, 0.78f, 0.08f));
        AplicarGrupo(verdZ, EstadoEixoZ == EstadoLuz.Verde, new Color(0.12f, 0.96f, 0.28f));
    }

    private void AplicarGrupo(List<MeshRenderer> lista, bool aceso, Color corAcesa)
    {
        Color baseCor = aceso ? corAcesa : new Color(0.08f, 0.08f, 0.08f);
        Color emissao = aceso ? corAcesa * 2.8f : Color.black;

        for (int i = 0; i < lista.Count; i++)
        {
            MeshRenderer r = lista[i];
            if (r == null) continue;
            r.GetPropertyBlock(mpb);
            mpb.SetColor(IdBaseColor, baseCor);
            mpb.SetColor(IdColor, baseCor);
            mpb.SetColor(IdEmissionColor, emissao);
            mpb.SetColor(IdEmissiveColor, emissao * 2.5f);
            r.SetPropertyBlock(mpb);
        }
    }
}