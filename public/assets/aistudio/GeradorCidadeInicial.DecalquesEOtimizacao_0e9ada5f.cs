using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.Rendering;

public partial class GeradorCidadeInicial
{
    [Header("Decalques Procedurais e Otimização (Etapa 5)")]
    public bool criarDecalquesProcedurais = true;
    [Range(0.25f, 2.0f)]
    [Tooltip("Densidade geral de sujeira, rachaduras e marcas de pneu no asfalto.")]
    public float densidadeDecalques = 1.0f;
    public bool criarMarcasPneuCruzamentos = true;
    public bool criarRachadurasAsfalto = true;
    public bool criarManchasSujeiraEOleo = true;

    [Header("Otimização da Cidade (Etapa 5)")]
    public bool otimizarCidadeEtapa5 = true;
    public bool desativarSombraEmPropsPequenos = true;
    public bool ativarCullingPorDistancia = true;
    [Range(80f, 350f)]
    public float distanciaVisibilidadeDetalhes = 155f;

    [NonSerialized] private Texture2D texDecalSujeira;
    [NonSerialized] private Texture2D texDecalRachadura;
    [NonSerialized] private Texture2D texDecalPneu;
    [NonSerialized] private Texture2D texDecalOleo;

    private struct DecalQuadInfo
    {
        public Vector3 centro;
        public float largura;
        public float comprimento;
        public float rotacaoY;
        public Color32 cor;
    }

    partial void ExecutarEtapa5(Transform raiz)
    {
        if (raiz == null) return;

        if (criarDecalquesProcedurais)
            ConstruirDecalquesProcedurais(raiz);

        if (otimizarCidadeEtapa5)
            OtimizarCidadeEtapa5(raiz);
    }

    // ============================================================
    // 1) SISTEMA DE DECALQUES PROCEDURAIS
    // ============================================================
    private void ConstruirDecalquesProcedurais(Transform raiz)
    {
        PrepararTexturasDecalques();

        GameObject grupoDecalques = new GameObject("Decalques_Procedurais_Cidade");
        grupoDecalques.transform.SetParent(raiz, false);

        float escalaQualidade = presetQualidade == PresetQualidade.Leve ? 0.55f : (presetQualidade == PresetQualidade.Pesado ? 1.35f : 1.0f);
        float mult = Mathf.Clamp(densidadeDecalques * escalaQualidade, 0.2f, 2.5f);

        List<DecalQuadInfo> listaPneus = new List<DecalQuadInfo>(256);
        List<DecalQuadInfo> listaRachaduras = new List<DecalQuadInfo>(256);
        List<DecalQuadInfo> listaSujeira = new List<DecalQuadInfo>(320);
        List<DecalQuadInfo> listaOleo = new List<DecalQuadInfo>(160);

        float yBase = TopoAsfalto;
        float halfX = larguraTotal * 0.5f;
        float halfZ = comprimentoTotal * 0.5f;

        if (criarMarcasPneuCruzamentos)
            ColetarMarcasPneuCruzamentos(listaPneus, yBase + 0.011f, mult);

        if (criarRachadurasAsfalto)
            ColetarRachadurasAsfalto(listaRachaduras, yBase + 0.009f, halfX, halfZ, mult);

        if (criarManchasSujeiraEOleo)
        {
            ColetarManchasSujeira(listaSujeira, yBase + 0.008f, halfX, halfZ, mult);
            ColetarManchasOleo(listaOleo, yBase + 0.012f, halfX, halfZ, mult);
        }

        if (listaSujeira.Count > 0)
        {
            Material matSujeira = ObterMaterial("decal_sujeira", new Color(1f, 1f, 1f, 0.78f), texDecalSujeira, Vector2.one, 0.03f, false, true);
            CriarBatchDecal("Batch_Decal_Sujeira", grupoDecalques.transform, listaSujeira, matSujeira);
        }

        if (listaRachaduras.Count > 0)
        {
            Material matRach = ObterMaterial("decal_rachadura", new Color(1f, 1f, 1f, 0.88f), texDecalRachadura, Vector2.one, 0.04f, false, true);
            CriarBatchDecal("Batch_Decal_Rachaduras", grupoDecalques.transform, listaRachaduras, matRach);
        }

        if (listaPneus.Count > 0)
        {
            Material matPneu = ObterMaterial("decal_pneu", new Color(1f, 1f, 1f, 0.82f), texDecalPneu, Vector2.one, 0.08f, false, true);
            CriarBatchDecal("Batch_Decal_MarcasPneu", grupoDecalques.transform, listaPneus, matPneu);
        }

        if (listaOleo.Count > 0)
        {
            Material matOleo = ObterMaterial("decal_oleo", new Color(1f, 1f, 1f, 0.80f), texDecalOleo, Vector2.one, 0.65f, false, true);
            CriarBatchDecal("Batch_Decal_ManchasOleo", grupoDecalques.transform, listaOleo, matOleo);
        }
    }

    private void ColetarMarcasPneuCruzamentos(List<DecalQuadInfo> lista, float y, float mult)
    {
        float meiaRua = larguraRua * 0.5f;
        int marcasPorCruzamento = Mathf.Clamp(Mathf.RoundToInt(3f * mult), 1, 6);

        for (int kx = 0; kx <= quadrasX; kx++)
        {
            float cx = CentroRuaX(kx);
            for (int kz = 0; kz <= quadrasZ; kz++)
            {
                float cz = CentroRuaZ(kz);
                if (RioAquiLocal(cx, cz, meiaRua + 2.5f))
                    continue;

                float chance = Hash(kx * 13 + 7, kz * 19 + 3, seedAleatoria + 501);
                if (chance < 0.22f) continue;

                for (int m = 0; m < marcasPorCruzamento; m++)
                {
                    float h1 = Hash(kx * 31 + m, kz * 17 + m, seedAleatoria + 509);
                    float h2 = Hash(kx * 43 + m, kz * 29 + m, seedAleatoria + 521);
                    float h3 = Hash(kx * 53 + m, kz * 11 + m, seedAleatoria + 541);

                    bool curva = h1 > 0.45f;
                    float angulo = curva
                        ? (Mathf.FloorToInt(h2 * 4f) * 90f + (h3 - 0.5f) * 44f)
                        : (h2 > 0.5f ? 0f : 90f) + (h3 - 0.5f) * 10f;

                    float ox = (h1 - 0.5f) * (meiaRua * 1.15f);
                    float oz = (h2 - 0.5f) * (meiaRua * 1.15f);
                    Vector3 pos = new Vector3(cx + ox, y + m * 0.0004f, cz + oz);
                    if (RioAquiLocal(pos.x, pos.z, 2.2f)) continue;

                    byte alpha = (byte)Mathf.RoundToInt(Mathf.Lerp(115f, 210f, h3));
                    lista.Add(new DecalQuadInfo
                    {
                        centro = pos,
                        largura = curva ? Mathf.Lerp(1.6f, 2.4f, h1) : Mathf.Lerp(1.4f, 1.9f, h1),
                        comprimento = curva ? Mathf.Lerp(3.2f, 5.4f, h2) : Mathf.Lerp(3.8f, 6.4f, h2),
                        rotacaoY = angulo,
                        cor = new Color32(26, 26, 28, alpha)
                    });
                }
            }
        }
    }

    private void ColetarRachadurasAsfalto(List<DecalQuadInfo> lista, float y, float halfX, float halfZ, float mult)
    {
        int totalX = Mathf.Clamp(Mathf.RoundToInt((quadrasX + 1) * quadrasZ * 2.2f * mult), 8, 220);
        for (int i = 0; i < totalX; i++)
        {
            float h1 = Hash(i, 11, seedAleatoria + 601);
            float h2 = Hash(i, 23, seedAleatoria + 613);
            float h3 = Hash(i, 37, seedAleatoria + 619);

            bool eixoX = (i % 2 == 0);
            float x, z, rotY;

            if (eixoX)
            {
                int kz = Mathf.Clamp(Mathf.FloorToInt(h1 * (quadrasZ + 1)), 0, quadrasZ);
                x = Mathf.Lerp(-halfX + 4f, halfX - 4f, h2);
                z = CentroRuaZ(kz) + (h3 - 0.5f) * (larguraRua * 0.65f);
                rotY = (h3 - 0.5f) * 35f + 90f;
            }
            else
            {
                int kx = Mathf.Clamp(Mathf.FloorToInt(h1 * (quadrasX + 1)), 0, quadrasX);
                x = CentroRuaX(kx) + (h3 - 0.5f) * (larguraRua * 0.65f);
                z = Mathf.Lerp(-halfZ + 4f, halfZ - 4f, h2);
                rotY = (h3 - 0.5f) * 35f;
            }

            if (RioAquiLocal(x, z, 2.6f))
                continue;

            byte alpha = (byte)Mathf.RoundToInt(Mathf.Lerp(145f, 225f, h2));
            lista.Add(new DecalQuadInfo
            {
                centro = new Vector3(x, y + (i % 5) * 0.0002f, z),
                largura = Mathf.Lerp(1.6f, 3.0f, h1),
                comprimento = Mathf.Lerp(2.4f, 4.6f, h3),
                rotacaoY = rotY,
                cor = new Color32(255, 255, 255, alpha)
            });
        }
    }

    private void ColetarManchasSujeira(List<DecalQuadInfo> lista, float y, float halfX, float halfZ, float mult)
    {
        float meiaRua = larguraRua * 0.42f;
        int total = Mathf.Clamp(Mathf.RoundToInt((quadrasX + 1) * (quadrasZ + 1) * 3.0f * mult), 12, 280);

        for (int i = 0; i < total; i++)
        {
            float h1 = Hash(i, 41, seedAleatoria + 701);
            float h2 = Hash(i, 59, seedAleatoria + 709);
            float h3 = Hash(i, 73, seedAleatoria + 719);

            bool pertoMeioFioX = (i % 2 == 0);
            float x, z;
            if (pertoMeioFioX)
            {
                int kz = Mathf.Clamp(Mathf.FloorToInt(h1 * (quadrasZ + 1)), 0, quadrasZ);
                float lado = h3 > 0.5f ? 1f : -1f;
                x = Mathf.Lerp(-halfX + 3f, halfX - 3f, h2);
                z = CentroRuaZ(kz) + lado * meiaRua;
            }
            else
            {
                int kx = Mathf.Clamp(Mathf.FloorToInt(h1 * (quadrasX + 1)), 0, quadrasX);
                float lado = h3 > 0.5f ? 1f : -1f;
                x = CentroRuaX(kx) + lado * meiaRua;
                z = Mathf.Lerp(-halfZ + 3f, halfZ - 3f, h2);
            }

            if (RioAquiLocal(x, z, 2.8f))
                continue;

            byte tom = (byte)Mathf.RoundToInt(Mathf.Lerp(170f, 235f, h1));
            byte alpha = (byte)Mathf.RoundToInt(Mathf.Lerp(90f, 175f, h2));
            lista.Add(new DecalQuadInfo
            {
                centro = new Vector3(x, y + (i % 4) * 0.0002f, z),
                largura = Mathf.Lerp(2.2f, 4.4f, h1),
                comprimento = Mathf.Lerp(2.4f, 5.0f, h3),
                rotacaoY = h2 * 360f,
                cor = new Color32(tom, (byte)(tom * 0.94f), (byte)(tom * 0.86f), alpha)
            });
        }
    }

    private void ColetarManchasOleo(List<DecalQuadInfo> lista, float y, float halfX, float halfZ, float mult)
    {
        float faixaEstac = larguraRua * 0.34f;
        int total = Mathf.Clamp(Mathf.RoundToInt((quadrasX + 1) * (quadrasZ + 1) * 1.4f * mult), 6, 120);

        for (int i = 0; i < total; i++)
        {
            float h1 = Hash(i, 89, seedAleatoria + 809);
            float h2 = Hash(i, 97, seedAleatoria + 811);
            float h3 = Hash(i, 103, seedAleatoria + 821);

            bool eixoX = (i % 2 == 0);
            float x, z;
            if (eixoX)
            {
                int kz = Mathf.Clamp(Mathf.FloorToInt(h1 * (quadrasZ + 1)), 0, quadrasZ);
                float lado = h3 > 0.5f ? 1f : -1f;
                x = Mathf.Lerp(-halfX + 5f, halfX - 5f, h2);
                z = CentroRuaZ(kz) + lado * faixaEstac;
            }
            else
            {
                int kx = Mathf.Clamp(Mathf.FloorToInt(h1 * (quadrasX + 1)), 0, quadrasX);
                float lado = h3 > 0.5f ? 1f : -1f;
                x = CentroRuaX(kx) + lado * faixaEstac;
                z = Mathf.Lerp(-halfZ + 5f, halfZ - 5f, h2);
            }

            if (RioAquiLocal(x, z, 2.5f))
                continue;

            byte alpha = (byte)Mathf.RoundToInt(Mathf.Lerp(120f, 195f, h3));
            lista.Add(new DecalQuadInfo
            {
                centro = new Vector3(x, y + (i % 3) * 0.0002f, z),
                largura = Mathf.Lerp(1.0f, 1.9f, h1),
                comprimento = Mathf.Lerp(1.2f, 2.3f, h2),
                rotacaoY = h1 * 360f,
                cor = new Color32(28, 32, 36, alpha)
            });
        }
    }

    private void CriarBatchDecal(string nome, Transform pai, List<DecalQuadInfo> itens, Material mat)
    {
        if (itens == null || itens.Count == 0 || mat == null) return;

        int n = itens.Count;
        List<Vector3> verts = new List<Vector3>(n * 4);
        List<Vector3> norms = new List<Vector3>(n * 4);
        List<Vector2> uvs = new List<Vector2>(n * 4);
        List<Color32> cores = new List<Color32>(n * 4);
        List<int> tris = new List<int>(n * 6);

        for (int i = 0; i < n; i++)
        {
            DecalQuadInfo d = itens[i];
            float hw = d.largura * 0.5f;
            float hl = d.comprimento * 0.5f;
            Quaternion q = Quaternion.Euler(0f, d.rotacaoY, 0f);

            int idx = verts.Count;
            verts.Add(d.centro + q * new Vector3(-hw, 0f, -hl));
            verts.Add(d.centro + q * new Vector3(-hw, 0f, hl));
            verts.Add(d.centro + q * new Vector3(hw, 0f, hl));
            verts.Add(d.centro + q * new Vector3(hw, 0f, -hl));

            norms.Add(Vector3.up);
            norms.Add(Vector3.up);
            norms.Add(Vector3.up);
            norms.Add(Vector3.up);

            uvs.Add(new Vector2(0f, 0f));
            uvs.Add(new Vector2(0f, 1f));
            uvs.Add(new Vector2(1f, 1f));
            uvs.Add(new Vector2(1f, 0f));

            cores.Add(d.cor);
            cores.Add(d.cor);
            cores.Add(d.cor);
            cores.Add(d.cor);

            tris.Add(idx); tris.Add(idx + 1); tris.Add(idx + 2);
            tris.Add(idx); tris.Add(idx + 2); tris.Add(idx + 3);
        }

        Mesh mesh = new Mesh { name = "Mesh_" + nome };
        if (verts.Count > 65000)
            mesh.indexFormat = IndexFormat.UInt32;

        mesh.SetVertices(verts);
        mesh.SetNormals(norms);
        mesh.SetUVs(0, uvs);
        mesh.SetColors(cores);
        mesh.SetTriangles(tris, 0);
        mesh.RecalculateBounds();
        RegistrarMesh(mesh);

        GameObject go = new GameObject(nome);
        go.transform.SetParent(pai, false);
        go.isStatic = true;

        go.AddComponent<MeshFilter>().sharedMesh = mesh;
        MeshRenderer mr = go.AddComponent<MeshRenderer>();
        mr.sharedMaterial = mat;
        mr.shadowCastingMode = ShadowCastingMode.Off;
        mr.receiveShadows = true;
    }

    private void PrepararTexturasDecalques()
    {
        int s = seedAleatoria + 900;

        texDecalSujeira = NovaTexturaDecalClamp("TexDecalSujeira", 128, (x, y) =>
        {
            float nx = (x / 127f) * 2f - 1f;
            float ny = (y / 127f) * 2f - 1f;
            float r = Mathf.Sqrt(nx * nx + ny * ny);
            float n1 = ValueNoise(x, y, 128, 6, s + 1);
            float n2 = ValueNoise(x, y, 128, 16, s + 2);
            float borda = Mathf.Clamp01(1f - Mathf.SmoothStep(0.35f, 0.96f, r + (n1 - 0.5f) * 0.42f));
            float a = borda * Mathf.Clamp01(0.42f + n2 * 0.58f);
            float tom = 0.14f + n2 * 0.12f;
            return Cor(tom, tom * 0.92f, tom * 0.80f, a);
        });

        texDecalRachadura = NovaTexturaDecalClamp("TexDecalRachadura", 128, (x, y) =>
        {
            float u = x / 127f;
            float v = y / 127f;
            float desvio = (ValueNoise(x, y, 128, 8, s + 11) - 0.5f) * 0.24f;
            float distPrincipal = Mathf.Abs(u - 0.5f + desvio);
            float ramo1 = Mathf.Abs((u - 0.5f + desvio * 0.6f) - (v - 0.35f) * 0.7f);
            float ramo2 = Mathf.Abs((u - 0.5f - desvio * 0.6f) + (v - 0.62f) * 0.65f);

            float trinca = Mathf.Max(
                1f - Mathf.SmoothStep(0.012f, 0.045f, distPrincipal),
                Mathf.Max(
                    v > 0.35f ? (1f - Mathf.SmoothStep(0.008f, 0.032f, ramo1)) * 0.85f : 0f,
                    v < 0.65f ? (1f - Mathf.SmoothStep(0.008f, 0.032f, ramo2)) * 0.85f : 0f));

            float fadePontas = Mathf.Sin(v * Mathf.PI);
            float a = Mathf.Clamp01(trinca * fadePontas);
            return Cor(0.06f, 0.06f, 0.07f, a);
        });

        texDecalPneu = NovaTexturaDecalClamp("TexDecalPneu", 128, (x, y) =>
        {
            float u = x / 127f;
            float v = y / 127f;
            float curva = Mathf.Sin(v * Mathf.PI) * 0.12f;
            float trilhaE = Mathf.Abs(u - 0.26f - curva);
            float trilhaD = Mathf.Abs(u - 0.74f - curva);
            float d = Mathf.Min(trilhaE, trilhaD);
            float ruido = ValueNoise(x, y, 128, 24, s + 21);
            float traco = 1f - Mathf.SmoothStep(0.045f, 0.105f, d);
            float fade = Mathf.Pow(Mathf.Sin(v * Mathf.PI), 0.75f);
            float a = Mathf.Clamp01(traco * fade * (0.65f + ruido * 0.35f));
            return Cor(0.08f, 0.08f, 0.09f, a);
        });

        texDecalOleo = NovaTexturaDecalClamp("TexDecalOleo", 128, (x, y) =>
        {
            float nx = (x / 127f) * 2f - 1f;
            float ny = (y / 127f) * 2f - 1f;
            float r = Mathf.Sqrt(nx * nx + ny * ny);
            float n = ValueNoise(x, y, 128, 8, s + 31);
            float a = Mathf.Clamp01(1f - Mathf.SmoothStep(0.30f, 0.86f, r + (n - 0.5f) * 0.35f));
            float brilho = Mathf.Sin((nx + ny + n) * 6f) * 0.05f;
            return Cor(0.07f + brilho, 0.08f, 0.11f - brilho * 0.5f, a * 0.85f);
        });
    }

    private Texture2D NovaTexturaDecalClamp(string nome, int tam, Func<int, int, Color32> func)
    {
        Texture2D tex = NovaTextura(nome, tam, func);
        tex.wrapMode = TextureWrapMode.Clamp;
        return tex;
    }

    // ============================================================
    // 2) OTIMIZAÇÃO DE RENDERIZAÇÃO, SOMBRAS E CULLING
    // ============================================================
    private void OtimizarCidadeEtapa5(Transform raiz)
    {
        for (int i = 0; i < materiaisGerados.Count; i++)
        {
            if (materiaisGerados[i] != null)
                materiaisGerados[i].enableInstancing = true;
        }

        Renderer[] renderers = raiz.GetComponentsInChildren<Renderer>(true);
        for (int i = 0; i < renderers.Length; i++)
        {
            Renderer r = renderers[i];
            if (r == null) continue;

            GameObject go = r.gameObject;
            bool dinamico = EhSubarvoreDinamica(go.transform);
            if (!dinamico && !go.isStatic)
                go.isStatic = true;

            if (desativarSombraEmPropsPequenos && !dinamico)
            {
                string n = go.name.ToLowerInvariant();
                if (n.Contains("decal") || n.Contains("faixa") || n.Contains("fio") ||
                    n.Contains("bueiro") || n.Contains("saco") || n.Contains("cone") ||
                    n.Contains("grama") || n.Contains("vapor"))
                {
                    r.shadowCastingMode = ShadowCastingMode.Off;
                }
            }
        }

        if (ativarCullingPorDistancia)
        {
            Type tipoExterno = LocalizarTipoOtimizadorRuntime();
            if (tipoExterno != null && raiz.GetComponent(tipoExterno) == null)
            {
                Component comp = raiz.gameObject.AddComponent(tipoExterno);
                ConfigurarOtimizadorExterno(comp, tipoExterno);
            }
            else if (raiz.GetComponent<CidadeOtimizadorDistanciaInterno>() == null)
            {
                var intern = raiz.gameObject.AddComponent<CidadeOtimizadorDistanciaInterno>();
                intern.distanciaDetalhes = distanciaVisibilidadeDetalhes;
            }
        }
    }

    private bool EhSubarvoreDinamica(Transform t)
    {
        while (t != null)
        {
            if (objetosDinamicos.Contains(t.gameObject))
                return true;

            string n = t.name.ToLowerInvariant();
            if (n.Contains("veiculo") || n.Contains("carro") || n.Contains("moto") ||
                n.Contains("bicicleta") || n.Contains("caminhao") || n.Contains("onibus") ||
                n.Contains("barco") || n.Contains("pedestre") || n.Contains("fauna") ||
                n.Contains("trafego") || n.Contains("transito") || n.Contains("npc") ||
                n.Contains("anim_") || n.Contains("semaforo") || n.Contains("chassi"))
            {
                return true;
            }

            t = t.parent;
        }
        return false;
    }

    private static Type LocalizarTipoOtimizadorRuntime()
    {
#if UNITY_EDITOR
        var tipos = UnityEditor.TypeCache.GetTypesDerivedFrom<MonoBehaviour>();
        for (int i = 0; i < tipos.Count; i++)
        {
            if (tipos[i].Name == "CidadeOtimizadorRuntime")
                return tipos[i];
        }
        return null;
#else
        Type t = typeof(GeradorCidadeInicial).Assembly.GetType("CidadeOtimizadorRuntime", false);
        if (t != null && typeof(MonoBehaviour).IsAssignableFrom(t))
            return t;

        return Type.GetType("CidadeOtimizadorRuntime, Assembly-CSharp", false);
#endif
    }

    private void ConfigurarOtimizadorExterno(Component comp, Type tipo)
    {
        if (comp == null || tipo == null) return;
        FieldInfo f = tipo.GetField("distanciaDetalhes", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
        if (f != null && f.FieldType == typeof(float))
            f.SetValue(comp, distanciaVisibilidadeDetalhes);
    }

    private bool RioAquiLocal(float x, float z, float margem = 2.5f)
    {
        if (!criarRio) return false;
        return RetanguloSobreRio(x, z, margem * 2f, margem * 2f);
    }

    private bool RioAquiLocal(Vector3 pos, float margem = 2.5f)
    {
        return RioAquiLocal(pos.x, pos.z, margem);
    }
}

internal class CidadeOtimizadorDistanciaInterno : MonoBehaviour
{
    public float distanciaDetalhes = 155f;

    private readonly List<Renderer> alvos = new List<Renderer>();
    private readonly List<Vector3> centros = new List<Vector3>();
    private float proximoCheck;
    private int cursor;

    private void Start()
    {
        Renderer[] todos = GetComponentsInChildren<Renderer>(true);
        for (int i = 0; i < todos.Length; i++)
        {
            Renderer r = todos[i];
            if (r == null) continue;
            string n = r.gameObject.name.ToLowerInvariant();
            if (n.Contains("batch_") || n.Contains("asfalto") || n.Contains("terreno") || n.Contains("rio"))
                continue;

            Bounds b = r.bounds;
            if (b.size.magnitude < 14f)
            {
                alvos.Add(r);
                centros.Add(b.center);
            }
        }
    }

    private void Update()
    {
        if (alvos.Count == 0) return;
        if (Time.unscaledTime < proximoCheck) return;
        proximoCheck = Time.unscaledTime + 0.08f;

        Camera cam = Camera.main;
        if (cam == null) return;

        Vector3 camPos = cam.transform.position;
        float sqrMax = distanciaDetalhes * distanciaDetalhes;
        int lote = Mathf.Min(120, alvos.Count);

        for (int k = 0; k < lote; k++)
        {
            if (cursor >= alvos.Count) cursor = 0;
            Renderer r = alvos[cursor];
            if (r != null)
            {
                float d2 = (centros[cursor] - camPos).sqrMagnitude;
                bool visivel = d2 <= sqrMax;
                if (r.enabled != visivel)
                    r.enabled = visivel;
            }
            cursor++;
        }
    }
}