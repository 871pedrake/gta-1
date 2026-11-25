using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
#if UNITY_EDITOR
using UnityEditor;
#endif

[DisallowMultipleComponent]
public partial class GeradorCidadeInicial : MonoBehaviour
{
    public const string NOME_RAIZ = "Cidade_Inicial_Gerada";

    public enum PresetQualidade { Leve, Medio, Pesado }
    public enum Distrito { Centro, Comercial, Shopping, Orla, Industrial, Residencial, Morro }
    public enum TipoFachada { Janelas, Vidro, ArranhaCeuEspelhado, Tijolo, Casa, Galpao, Loja, ComercialComTerreo, ResidencialComVarandas }
    public enum EixoRio { LesteOeste_X, NorteSul_Z }
    public enum LadoMorro { Leste, Oeste, Sul, Norte }

    [Header("Qualidade e Semente")]
    public PresetQualidade presetQualidade = PresetQualidade.Medio;
    public int seedAleatoria = 2026;
    public bool combinarMalhasPorDistrito = true;

    [Header("Grade da Cidade")]
    [Min(2)] public int quadrasX = 6;
    [Min(2)] public int quadrasZ = 6;
    [Min(10f)] public float tamanhoQuadra = 24f;
    [Min(6f)] public float larguraRua = 10f;
    public float alturaChao = 0f;
    public float elevacaoAsfalto = 0.04f;
    public float alturaCalcada = 0.18f;
    public float recuoCalcada = 2.0f;
    public float margemEntrePredios = 1.6f;

    [Header("Edifícios")]
    public float metrosPorAndar = 3.2f;
    public float alturaMinimaPredio = 8f;
    public float alturaMaximaPredio = 28f;

    [Header("Texturas Procedurais")]
    public bool usarTexturas = true;
    public Texture2D fachadaPersonalizada;
    public float metrosPorTexturaAsfalto = 6f;
    public float metrosPorTexturaCalcada = 4f;
    public float metrosPorTexturaGrama = 6f;

    [Header("Rio, Orla, Pontes e Porto")]
    public bool criarRio = true;
    public EixoRio eixoRio = EixoRio.LesteOeste_X;
    public int indiceQuadraRio = -1;
    public Vector3 posRio = Vector3.zero;
    [Min(6f)] public float larguraRio = 14f;
    [Min(2f)] public float profundidadeRio = 4.2f;
    [Min(0.3f)] public float rebaixoAgua = 1.15f;
    [Min(10f)] public float extensaoMeandroRio = 56f;
    [Min(1f)] public float fatorEstuario = 1.65f;
    public float velocidadeAgua = 1.0f;
    [Min(12f)] public float comprimentoPonteGrande = 22f;
    public bool criarPorto = true;
    public bool criarPortoIndustrial = true;
    [Range(1f, 6f)] public float densidadeIndustria = 4f;
    [Range(0, 6)] public int barcosAncorados = 3;
    [Range(0, 8)] public int barcosNavegando = 3;

    [Header("Shopping, Comércio, Props e Semáforos (Etapa 2)")]
    public bool criarShopping = true;
    public bool criarRuaComercial = true;
    public bool criarPropsUrbanos = true;
    [Range(0f, 1f)] public float densidadeProps = 0.8f;
    public bool criarSemaforos = true;
    [Min(3f)] public float duracaoVerdeSemaforo = 9f;
    public bool criarObraComGrua = true;

    [Header("Morro / Favela (Etapa 3)")]
    public bool criarMorro = true;
    public LadoMorro ladoMorro = LadoMorro.Norte;
    [Min(8f)] public float alturaMorro = 22f;
    [Min(40f)] public float profundidadeMorro = 88f;
    [Min(4.5f)] public float larguraEstradaMorro = 6.2f;
    [Range(0f, 1f)] public float densidadeCasasMorro = 0.75f;
    public bool criarCampinhoMorro = true;
    public bool criarIgrejinhaMorro = true;
    public bool criarFiacaoMorro = true;

    public float larguraTotal => quadrasX * tamanhoQuadra + (quadrasX + 1) * larguraRua;
    public float comprimentoTotal => quadrasZ * tamanhoQuadra + (quadrasZ + 1) * larguraRua;
    public float TopoAsfalto => alturaChao + elevacaoAsfalto;
    public float NivelAgua => TopoAsfalto - rebaixoAgua;
    public float TopoCalcada(bool ehPraca) => TopoAsfalto + alturaCalcada + (ehPraca ? 0.04f : 0f);

    public float TopoTerreno(float x, float z)
    {
        float delta = 0f;
        CalcularDeltaTerrenoMorro(x, z, ref delta);
        return delta;
    }

    internal static readonly float[] NiveisBrilho = { 0.86f, 0.94f, 1.02f, 1.08f };
    internal static readonly Color[] PaletaPredios =
    {
        new Color(0.88f, 0.85f, 0.78f),
        new Color(0.76f, 0.80f, 0.84f),
        new Color(0.84f, 0.72f, 0.62f),
        new Color(0.72f, 0.74f, 0.78f),
        new Color(0.90f, 0.88f, 0.82f),
        new Color(0.68f, 0.76f, 0.82f),
        new Color(0.86f, 0.78f, 0.66f),
        new Color(0.78f, 0.78f, 0.76f)
    };

    [NonSerialized] internal Distrito[,] gradeDistrito;
    [NonSerialized] internal readonly List<Material> materiaisGerados = new List<Material>();
    [NonSerialized] internal readonly List<Mesh> meshesGerados = new List<Mesh>();
    [NonSerialized] internal readonly HashSet<GameObject> objetosDinamicos = new HashSet<GameObject>();
    [NonSerialized] internal readonly Dictionary<string, Material> cacheMateriais = new Dictionary<string, Material>();
    [NonSerialized] internal readonly List<LineRenderer> linhasGeradas = new List<LineRenderer>();
    [NonSerialized] internal readonly List<Light> luzesGeradas = new List<Light>();
    [NonSerialized] internal readonly List<ParticleSystem> particulasGeradas = new List<ParticleSystem>();

    [NonSerialized] internal Texture2D texAsfalto, texCalcada, texGrama, texMadeira;
    [NonSerialized] internal Texture2D texCasa, texVidro, texTijolo, texMetal, texJanelas;
    [NonSerialized] internal Texture2D texAgua, texEspuma;

    [NonSerialized] private Mesh meshCuboUnitario;
    [NonSerialized] private Mesh meshEsferaUnitaria;
    [NonSerialized] private readonly Dictionary<int, Mesh> cacheCilindros = new Dictionary<int, Mesh>();

    partial void PrepararTexturasEtapa2();
    partial void PrepararTexturasEtapa3();
    partial void CalcularDeltaTerrenoMorro(float x, float z, ref float delta);
    partial void ExecutarEtapa2(Transform raiz);
    partial void ExecutarEtapa3(Transform raiz);
    partial void ExecutarEtapa4(Transform raiz);
    partial void ExecutarEtapa5(Transform raiz);

    // ============================================================
    // AÇÕES DO EDITOR E CICLO PRINCIPAL
    // ============================================================
    public void GerarCidade()
    {
        LimparCidade();
        UnityEngine.Random.InitState(seedAleatoria);

        GameObject raiz = new GameObject(NOME_RAIZ);
        raiz.transform.SetParent(transform, false);

        ResolverIndiceRio();
        AssignDistricts();
        PrepararTexturasBase();
        PrepararTexturasEtapa2();
        PrepararTexturasEtapa3();

        GerarMalhaRuas(raiz.transform);
        GerarQuadrasEPraca(raiz.transform);

        if (criarRio)
        {
            GerarRio(raiz.transform);
            GerarOrla(raiz.transform);
            GerarPontes(raiz.transform);
            if (criarPorto && criarPortoIndustrial)
                GerarPortoIndustrial(raiz.transform);
            GerarBarcos(raiz.transform);
        }

        ExecutarEtapa2(raiz.transform);
        ExecutarEtapa3(raiz.transform);
        ExecutarEtapa4(raiz.transform);
        ExecutarEtapa5(raiz.transform);
    }

    public void LimparCidade()
    {
        for (int i = transform.childCount - 1; i >= 0; i--)
        {
            Transform filho = transform.GetChild(i);
            if (filho.name == NOME_RAIZ || filho.name.StartsWith("Cidade_"))
            {
                if (Application.isPlaying) Destroy(filho.gameObject);
                else DestroyImmediate(filho.gameObject);
            }
        }

        cacheMateriais.Clear();
        materiaisGerados.Clear();
        meshesGerados.Clear();
        objetosDinamicos.Clear();
        linhasGeradas.Clear();
        luzesGeradas.Clear();
        particulasGeradas.Clear();
        cacheCilindros.Clear();
        meshCuboUnitario = null;
        meshEsferaUnitaria = null;
    }

    public void SalvarComoPrefabEditor()
    {
#if UNITY_EDITOR
        Transform raiz = transform.Find(NOME_RAIZ);
        if (raiz == null)
        {
            Debug.LogWarning("[GeradorCidadeInicial] Gere o mapa antes de salvar o prefab.");
            return;
        }
        string pasta = "Assets/Cidade";
        if (!AssetDatabase.IsValidFolder(pasta))
            AssetDatabase.CreateFolder("Assets", "Cidade");
        string caminho = AssetDatabase.GenerateUniqueAssetPath($"{pasta}/{NOME_RAIZ}.prefab");
        PrefabUtility.SaveAsPrefabAssetAndConnect(raiz.gameObject, caminho, InteractionMode.UserAction);
        Debug.Log($"[GeradorCidadeInicial] Prefab salvo em: {caminho}");
#endif
    }

    // ============================================================
    // RUAS, QUADRAS E PRAÇA CENTRAL
    // ============================================================
    private void GerarMalhaRuas(Transform raiz)
    {
        GameObject ruasObj = new GameObject("Malha_Ruas_Asfalto");
        ruasObj.transform.SetParent(raiz, false);

        Material matAsf = MatAsfalto();
        Material matFaixa = MatCor(new Color(0.95f, 0.84f, 0.22f), 0.12f);

        float lx = larguraTotal;
        float lz = comprimentoTotal;

        // Piso base de asfalto da cidade
        CriarCaixa("Asfalto_Base", ruasObj.transform, new Vector3(0f, TopoAsfalto - 0.05f, 0f),
            new Vector3(lx, 0.10f, lz), matAsf, metrosPorTexturaAsfalto, metrosPorTexturaAsfalto, true, true);

        // Faixas centrais nas ruas (não desenha em cima do rio)
        for (int kx = 0; kx <= quadrasX; kx++)
        {
            float rx = CentroRuaX(kx);
            for (int gz = 0; gz < quadrasZ; gz++)
            {
                float zc = CentroQuadraZ(gz);
                if (criarRio && RetanguloSobreRio(rx, zc, 1f, tamanhoQuadra)) continue;
                CriarCaixa("Asfalto_Faixa_V", ruasObj.transform, new Vector3(rx, TopoAsfalto + 0.008f, zc),
                    new Vector3(0.16f, 0.015f, tamanhoQuadra * 0.82f), matFaixa, 1f, 1f, false, false);
            }
        }

        for (int kz = 0; kz <= quadrasZ; kz++)
        {
            float rz = CentroRuaZ(kz);
            for (int gx = 0; gx < quadrasX; gx++)
            {
                float xc = CentroQuadraX(gx);
                if (criarRio && RetanguloSobreRio(xc, rz, tamanhoQuadra, 1f)) continue;
                CriarCaixa("Asfalto_Faixa_H", ruasObj.transform, new Vector3(xc, TopoAsfalto + 0.008f, rz),
                    new Vector3(tamanhoQuadra * 0.82f, 0.015f, 0.16f), matFaixa, 1f, 1f, false, false);
            }
        }
    }

    private void GerarQuadrasEPraca(Transform raiz)
    {
        GameObject quadrasGrupo = new GameObject("Quadras_Cidade");
        quadrasGrupo.transform.SetParent(raiz, false);

        int cxPraca = quadrasX / 2;
        int czPraca = quadrasZ / 2;
        Material matCalc = MatCalcada();

        for (int gx = 0; gx < quadrasX; gx++)
        {
            for (int gz = 0; gz < quadrasZ; gz++)
            {
                if (criarRio && QuadraEhCorredorRio(gx, gz)) continue;

                float x = CentroQuadraX(gx);
                float z = CentroQuadraZ(gz);
                float deltaY = TopoTerreno(x, z);
                bool ehPraca = (gx == cxPraca && gz == czPraca);

                GameObject qObj = new GameObject(ehPraca ? "Praca_Central" : $"Quadra_{gx}_{gz}");
                qObj.transform.SetParent(quadrasGrupo.transform, false);
                qObj.transform.localPosition = new Vector3(x, deltaY, z);

                float topoC = TopoCalcada(ehPraca);
                float espCalc = topoC - TopoAsfalto;
                CriarCaixa($"Calcada_{gx}_{gz}", qObj.transform, new Vector3(0f, TopoAsfalto + espCalc * 0.5f, 0f),
                    new Vector3(tamanhoQuadra, espCalc, tamanhoQuadra), matCalc, metrosPorTexturaCalcada, metrosPorTexturaCalcada, true, true);

                if (ehPraca)
                {
                    ConstruirPracaCentral(qObj.transform, tamanhoQuadra, topoC);
                }
                else
                {
                    Distrito dist = DistritoDe(gx, gz);
                    PreencherQuadraComPredios(qObj.transform, tamanhoQuadra, dist, gx, gz);
                }

                // Postes de iluminação nas esquinas
                float offP = tamanhoQuadra * 0.5f - 0.85f;
                CriarPosteRua(qObj.transform, new Vector3(-offP, topoC, -offP));
                CriarPosteRua(qObj.transform, new Vector3(offP, topoC, offP));
            }
        }
    }

    private void ConstruirPracaCentral(Transform pai, float tamanho, float topo)
    {
        float areaGrama = tamanho - 3.6f;
        CriarCaixa("Grama_Praca", pai, new Vector3(0f, topo + 0.04f, 0f),
            new Vector3(areaGrama, 0.08f, areaGrama), MatGrama(), metrosPorTexturaGrama, metrosPorTexturaGrama, true, true);

        // Fonte da praça (usada pelo NpcVidaPropria como ponto para sentar)
        GameObject fonte = new GameObject("Fonte_Praca");
        fonte.transform.SetParent(pai, false);
        fonte.transform.localPosition = new Vector3(0f, topo + 0.08f, 0f);
        Material matPedra = MatCor(new Color(0.76f, 0.76f, 0.78f), 0.25f);
        Material matAguaFonte = MatAguaSuperficie("agua_fonte");

        CriarCilindro("Borda_Fonte", fonte.transform, new Vector3(0f, 0.25f, 0f), 4.4f, 0.5f, matPedra, true, 16);
        CriarCilindro("Agua_Fonte", fonte.transform, new Vector3(0f, 0.42f, 0f), 3.9f, 0.14f, matAguaFonte, false, 16);
        CriarCilindro("Coluna_Fonte", fonte.transform, new Vector3(0f, 0.95f, 0f), 0.75f, 1.3f, matPedra, true, 10);
        CriarCilindro("Prato_Fonte", fonte.transform, new Vector3(0f, 1.55f, 0f), 1.8f, 0.24f, matPedra, false, 14);

        // Bancos e árvores em volta da fonte
        for (int i = 0; i < 4; i++)
        {
            float ang = i * 90f;
            GameObject b = new GameObject($"Banco_Praca_{i}");
            b.transform.SetParent(pai, false);
            b.transform.localRotation = Quaternion.Euler(0f, ang, 0f);
            b.transform.localPosition = Quaternion.Euler(0f, ang, 0f) * new Vector3(0f, topo + 0.08f, 3.6f);
            CriarBanco(b.transform);

            Vector3 pArv = Quaternion.Euler(0f, ang + 45f, 0f) * new Vector3(0f, topo + 0.08f, areaGrama * 0.38f);
            CriarArvoreVariada(pai, pArv, i, true);
        }
    }

    private void CriarPosteRua(Transform pai, Vector3 pos)
    {
        Material matPoste = MatCor(new Color(0.24f, 0.26f, 0.29f), 0.45f);
        CriarCilindro("Poste_Rua", pai, pos + Vector3.up * 2.4f, 0.18f, 4.8f, matPoste, true, 8);
        CriarCaixa("Braco_Rua", pai, pos + new Vector3(0.45f, 4.75f, 0f), new Vector3(1.1f, 0.12f, 0.12f), matPoste, 1f, 1f, false, false);
        CriarCaixa("Lampada_Rua", pai, pos + new Vector3(0.95f, 4.66f, 0f), new Vector3(0.38f, 0.14f, 0.26f), MatLampada(), 1f, 1f, false, false);
    }

    internal void CriarBanco(Transform pai)
    {
        Material matMad = MatMadeira();
        Material matFerro = MatCor(new Color(0.18f, 0.18f, 0.20f), 0.4f);
        CriarCaixa("Assento", pai, new Vector3(0f, 0.42f, 0f), new Vector3(1.8f, 0.10f, 0.52f), matMad, 1f, 1f, false, true);
        CriarCaixa("Encosto", pai, new Vector3(0f, 0.72f, 0.22f), new Vector3(1.8f, 0.42f, 0.08f), matMad, 1f, 1f, false, false);
        CriarCaixa("Pe_E", pai, new Vector3(-0.75f, 0.21f, 0f), new Vector3(0.10f, 0.42f, 0.46f), matFerro, 1f, 1f, false, false);
        CriarCaixa("Pe_D", pai, new Vector3(0.75f, 0.21f, 0f), new Vector3(0.10f, 0.42f, 0.46f), matFerro, 1f, 1f, false, false);
    }

    internal void CriarArvoreSimples(Transform pai, Vector3 pos, int idx)
    {
        GameObject arv = new GameObject($"Arvore_{idx}");
        arv.transform.SetParent(pai, false);
        arv.transform.localPosition = pos;
        CriarCilindro("Tronco", arv.transform, new Vector3(0f, 1.1f, 0f), 0.30f, 2.2f, MatTronco(), true, 7);
        CriarEsfera("Copa", arv.transform, new Vector3(0f, 2.75f, 0f), 2.1f, MatCopa(), false);
    }

    // ============================================================
    // COORDENADAS E REGISTROS
    // ============================================================
    internal float CentroQuadraX(int gx) =>
        -larguraTotal * 0.5f + larguraRua + gx * (tamanhoQuadra + larguraRua) + tamanhoQuadra * 0.5f;

    internal float CentroQuadraZ(int gz) =>
        -comprimentoTotal * 0.5f + larguraRua + gz * (tamanhoQuadra + larguraRua) + tamanhoQuadra * 0.5f;

    internal float CentroRuaX(int kx) =>
        -larguraTotal * 0.5f + larguraRua * 0.5f + kx * (tamanhoQuadra + larguraRua);

    internal float CentroRuaZ(int kz) =>
        -comprimentoTotal * 0.5f + larguraRua * 0.5f + kz * (tamanhoQuadra + larguraRua);

    internal void RegistrarObjetoDinamico(GameObject go)
    {
        if (go != null) objetosDinamicos.Add(go);
    }

    internal void RegistrarMesh(Mesh m)
    {
        if (m != null) meshesGerados.Add(m);
    }

    internal void RegistrarLinha(LineRenderer lr)
    {
        if (lr != null) linhasGeradas.Add(lr);
    }

    internal void RegistrarLuz(Light l)
    {
        if (l != null) luzesGeradas.Add(l);
    }

    internal void RegistrarParticula(ParticleSystem ps)
    {
        if (ps != null) particulasGeradas.Add(ps);
    }

    internal void CombinarGrupoEstatico(Transform grupo, string sufixoNome)
    {
        if (grupo == null) return;

        Dictionary<Material, List<CombineInstance>> porMat = new Dictionary<Material, List<CombineInstance>>();
        MeshFilter[] filtros = grupo.GetComponentsInChildren<MeshFilter>(true);
        List<MeshRenderer> paraDesativar = new List<MeshRenderer>();

        for (int i = 0; i < filtros.Length; i++)
        {
            MeshFilter mf = filtros[i];
            if (mf == null || mf.sharedMesh == null) continue;
            if (EhDinamicoNaHierarquia(mf.transform)) continue;

            MeshRenderer mr = mf.GetComponent<MeshRenderer>();
            if (mr == null || mr.sharedMaterial == null) continue;

            if (!porMat.TryGetValue(mr.sharedMaterial, out List<CombineInstance> lista))
            {
                lista = new List<CombineInstance>();
                porMat[mr.sharedMaterial] = lista;
            }

            lista.Add(new CombineInstance
            {
                mesh = mf.sharedMesh,
                transform = grupo.worldToLocalMatrix * mf.transform.localToWorldMatrix
            });
            paraDesativar.Add(mr);
        }

        if (porMat.Count == 0) return;

        for (int i = 0; i < paraDesativar.Count; i++)
        {
            MeshRenderer mr = paraDesativar[i];
            if (mr == null) continue;
            MeshFilter mf = mr.GetComponent<MeshFilter>();
            if (Application.isPlaying)
            {
                Destroy(mr);
                if (mf != null) Destroy(mf);
            }
            else
            {
                DestroyImmediate(mr);
                if (mf != null) DestroyImmediate(mf);
            }
        }

        int idx = 0;
        foreach (var kv in porMat)
        {
            List<CombineInstance> insts = kv.Value;
            int totalVerts = 0;
            for (int i = 0; i < insts.Count; i++) totalVerts += insts[i].mesh.vertexCount;

            Mesh combinada = new Mesh { name = $"Batch_{sufixoNome}_{idx++}" };
            if (totalVerts > 60000) combinada.indexFormat = IndexFormat.UInt32;
            combinada.CombineMeshes(insts.ToArray(), true, true);
            combinada.RecalculateBounds();
            RegistrarMesh(combinada);

            GameObject batchGo = new GameObject(combinada.name);
            batchGo.transform.SetParent(grupo, false);
            batchGo.isStatic = true;
            batchGo.AddComponent<MeshFilter>().sharedMesh = combinada;
            batchGo.AddComponent<MeshRenderer>().sharedMaterial = kv.Key;
        }
    }

    private bool EhDinamicoNaHierarquia(Transform t)
    {
        while (t != null)
        {
            if (objetosDinamicos.Contains(t.gameObject)) return true;
            if (t.name.StartsWith("ANIM_")) return true;
            t = t.parent;
        }
        return false;
    }

    // ============================================================
    // TEXTURAS BASE, RUÍDO E MATERIAIS
    // ============================================================
    private void PrepararTexturasBase()
    {
        if (!usarTexturas) return;
        int s = seedAleatoria;

        texAsfalto = NovaTextura("TexAsfalto", 128, (x, y) =>
        {
            float n = ValueNoise(x, y, 128, 18, s + 1) * 0.5f + Hash(x, y, s + 2) * 0.5f;
            float v = 0.16f + n * 0.08f;
            return Cor(v, v, v * 1.04f);
        });

        texCalcada = NovaTextura("TexCalcada", 128, (x, y) =>
        {
            bool junta = (x % 32 < 2) || (y % 32 < 2);
            float n = Hash(x, y, s + 3) * 0.06f;
            float v = (junta ? 0.54f : 0.68f) + n;
            return Cor(v, v * 0.99f, v * 0.96f);
        });

        texGrama = NovaTextura("TexGrama", 128, (x, y) =>
        {
            float n = ValueNoise(x, y, 128, 12, s + 4) * 0.65f + Hash(x, y, s + 5) * 0.35f;
            return Cor(0.18f + n * 0.10f, 0.42f + n * 0.18f, 0.14f + n * 0.06f);
        });

        texMadeira = NovaTextura("TexMadeira", 64, (x, y) =>
        {
            float veio = Mathf.Sin(y * 0.45f + ValueNoise(x, y, 64, 6, s + 6) * 4f) * 0.08f;
            return Cor(0.48f + veio, 0.30f + veio * 0.7f, 0.16f + veio * 0.4f);
        });

        texJanelas = NovaTextura("TexJanelasBase", 128, (x, y) =>
        {
            int lx = x % 32;
            int ly = y % 32;
            if (lx >= 6 && lx < 26 && ly >= 6 && ly < 24)
            {
                if (lx == 15 || lx == 16) return Cor(0.28f, 0.30f, 0.34f);
                return Cor(0.18f, 0.28f, 0.38f);
            }
            float p = 0.86f + (Hash(x, y, s + 10) - 0.5f) * 0.05f;
            return Cor(p, p, p);
        });

        texCasa = NovaTextura("TexCasaBase", 128, (x, y) =>
        {
            if (x >= 40 && x < 88 && y >= 40 && y < 88) return Cor(0.22f, 0.32f, 0.42f);
            float p = 0.90f + (Hash(x, y, s + 11) - 0.5f) * 0.05f;
            return Cor(p, p * 0.98f, p * 0.94f);
        });

        texVidro = NovaTextura("TexVidroBase", 128, (x, y) =>
        {
            bool montante = (x % 32 < 3) || (y % 32 < 3);
            if (montante) return Cor(0.16f, 0.20f, 0.24f);
            float grad = 0.75f + (y / 128f) * 0.25f;
            return Cor(0.22f * grad, 0.44f * grad, 0.62f * grad);
        });

        texTijolo = NovaTextura("TexTijoloBase", 128, (x, y) =>
        {
            int row = y / 16;
            int xx = x + (row % 2) * 16;
            if (xx % 32 < 2 || y % 16 < 2) return Cor(0.56f, 0.54f, 0.50f);
            float v = 0.85f + Hash(xx / 32, row, s + 12) * 0.22f;
            return Cor(0.68f * v, 0.34f * v, 0.22f * v);
        });

        texMetal = NovaTextura("TexMetalGalpao", 64, (x, y) =>
        {
            float onda = Mathf.Sin(x * Mathf.PI * 2f / 8f) * 0.08f;
            float v = 0.58f + onda;
            return Cor(v, v * 1.02f, v * 1.06f);
        });

        texAgua = NovaTextura("TexAgua", 128, (x, y) =>
        {
            float n = ValueNoise(x, y, 128, 10, s + 20) * 0.6f + ValueNoise(x, y, 128, 24, s + 21) * 0.4f;
            return Cor(0.10f + n * 0.14f, 0.45f + n * 0.22f, 0.58f + n * 0.20f, 0.78f);
        });

        texEspuma = NovaTextura("TexEspuma", 64, (x, y) =>
        {
            float n = ValueNoise(x, y, 64, 12, s + 22);
            return Cor(0.92f, 0.97f, 1f, Mathf.Clamp01(n * 0.85f));
        });
    }

    internal Material MatCor(Color cor, float smoothness = 0.1f, bool emissivo = false, bool transparente = false)
    {
        string chave = $"cor_{ColorUtility.ToHtmlStringRGBA(cor)}_{smoothness:F2}_{(emissivo ? 1 : 0)}_{(transparente ? 1 : 0)}";
        return ObterMaterial(chave, cor, null, Vector2.one, smoothness, emissivo, transparente);
    }

    internal Material MatAsfalto() => ObterMaterial("asfalto", Color.white, texAsfalto, Vector2.one, 0.08f, false, false);
    internal Material MatCalcada() => ObterMaterial("calcada", Color.white, texCalcada, Vector2.one, 0.06f, false, false);
    internal Material MatGrama() => ObterMaterial("grama", texGrama != null ? Color.white : new Color(0.22f, 0.50f, 0.18f), texGrama, Vector2.one, 0.04f, false, false);
    internal Material MatMadeira() => ObterMaterial("madeira", texMadeira != null ? Color.white : new Color(0.46f, 0.28f, 0.14f), texMadeira, Vector2.one, 0.12f, false, false);
    internal Material MatTronco() => MatCor(new Color(0.36f, 0.24f, 0.14f), 0.05f);
    internal Material MatCopa() => MatCor(new Color(0.18f, 0.50f, 0.20f), 0.04f);
    internal Material MatLampada() => ObterMaterial("lampada_rua", new Color(1.0f, 0.90f, 0.62f), null, Vector2.one, 0.2f, true, false);
    internal Material MatAguaTurva() => ObterMaterial("agua_turva", new Color(0.07f, 0.24f, 0.28f, 1f), texAgua, Vector2.one, 0.65f, false, false);
    internal Material MatAguaSuperficie(string chave) => ObterMaterial(chave, new Color(0.14f, 0.54f, 0.66f, 0.72f), texAgua, Vector2.one, 0.85f, false, true);
    internal Material MatEspuma() => ObterMaterial("agua_espuma", new Color(0.92f, 0.97f, 1f, 0.65f), texEspuma, Vector2.one, 0.2f, false, true);

    internal Material ObterMaterial(string chave, Color cor, Texture2D tex, Vector2 tiling, float smoothness, bool emissivo = false, bool transparente = false)
    {
        if (cacheMateriais.TryGetValue(chave, out Material existente) && existente != null)
            return existente;

        Shader sh = EscolherShaderPadrao();
        Material mat = new Material(sh) { name = "Cidade_" + chave };
        mat.enableInstancing = true;

        if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", cor);
        if (mat.HasProperty("_Color")) mat.SetColor("_Color", cor);

        if (tex != null)
        {
            if (mat.HasProperty("_BaseMap")) { mat.SetTexture("_BaseMap", tex); mat.SetTextureScale("_BaseMap", tiling); }
            if (mat.HasProperty("_MainTex")) { mat.SetTexture("_MainTex", tex); mat.SetTextureScale("_MainTex", tiling); }
        }

        if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", smoothness);
        if (mat.HasProperty("_Glossiness")) mat.SetFloat("_Glossiness", smoothness);

        if (emissivo)
        {
            mat.EnableKeyword("_EMISSION");
            if (mat.HasProperty("_EmissionColor")) mat.SetColor("_EmissionColor", cor * 1.4f);
            if (mat.HasProperty("_EmissiveColor")) mat.SetColor("_EmissiveColor", cor * 1.4f);
        }

        if (transparente)
        {
            if (mat.HasProperty("_Surface")) mat.SetFloat("_Surface", 1f);
            if (mat.HasProperty("_Mode")) mat.SetFloat("_Mode", 3f);
            mat.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
            mat.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
            mat.SetInt("_ZWrite", 0);
            mat.EnableKeyword("_ALPHABLEND_ON");
            mat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            mat.renderQueue = 3000;
        }

        cacheMateriais[chave] = mat;
        materiaisGerados.Add(mat);
        return mat;
    }

    private static Shader EscolherShaderPadrao()
    {
        string[] nomes = { "Universal Render Pipeline/Lit", "Standard", "Sprites/Default" };
        for (int i = 0; i < nomes.Length; i++)
        {
            Shader s = Shader.Find(nomes[i]);
            if (s != null && s.isSupported) return s;
        }
        return Shader.Find("Standard");
    }

    internal Texture2D NovaTextura(string nome, int tam, Func<int, int, Color32> func)
    {
        Texture2D tex = new Texture2D(tam, tam, TextureFormat.RGBA32, true)
        {
            name = nome,
            wrapMode = TextureWrapMode.Repeat,
            filterMode = FilterMode.Bilinear
        };
        Color32[] pixels = new Color32[tam * tam];
        for (int y = 0; y < tam; y++)
            for (int x = 0; x < tam; x++)
                pixels[y * tam + x] = func(x, y);
        tex.SetPixels32(pixels);
        tex.Apply(true, false);
        return tex;
    }

    internal static Color32 Cor(float r, float g, float b, float a = 1f) =>
        new Color32(
            (byte)Mathf.RoundToInt(Mathf.Clamp01(r) * 255f),
            (byte)Mathf.RoundToInt(Mathf.Clamp01(g) * 255f),
            (byte)Mathf.RoundToInt(Mathf.Clamp01(b) * 255f),
            (byte)Mathf.RoundToInt(Mathf.Clamp01(a) * 255f));

    internal static float Hash(int x, int y, int seed)
    {
        unchecked
        {
            uint h = (uint)(x * 374761393 + y * 668265263 + seed * 1442695041);
            h = (h ^ (h >> 13)) * 1274126177u;
            h ^= h >> 16;
            return (h & 0x00FFFFFFu) / 16777215f;
        }
    }

    internal static float ValueNoise(int x, int y, int tam, int freq, int seed)
    {
        freq = Mathf.Max(1, freq);
        float fx = (x / (float)Mathf.Max(1, tam)) * freq;
        float fy = (y / (float)Mathf.Max(1, tam)) * freq;
        int x0 = Mathf.FloorToInt(fx) % freq;
        int y0 = Mathf.FloorToInt(fy) % freq;
        if (x0 < 0) x0 += freq;
        if (y0 < 0) y0 += freq;
        int x1 = (x0 + 1) % freq;
        int y1 = (y0 + 1) % freq;

        float tx = fx - Mathf.Floor(fx);
        float ty = fy - Mathf.Floor(fy);
        tx = tx * tx * (3f - 2f * tx);
        ty = ty * ty * (3f - 2f * ty);

        float v00 = Hash(x0, y0, seed);
        float v10 = Hash(x1, y0, seed);
        float v01 = Hash(x0, y1, seed);
        float v11 = Hash(x1, y1, seed);
        return Mathf.Lerp(Mathf.Lerp(v00, v10, tx), Mathf.Lerp(v01, v11, tx), ty);
    }

    // ============================================================
    // PRIMITIVOS PROCEDURAIS (CAIXA, CILINDRO, ESFERA)
    // ============================================================
    internal GameObject CriarCaixa(string nome, Transform pai, Vector3 pos, Vector3 tam, Material mat,
        float tileU, float tileV, bool gerarUVPorFace, bool comCollider)
    {
        GameObject go = new GameObject(nome);
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;

        if (gerarUVPorFace || Mathf.Abs(tileU - 1f) > 0.01f || Mathf.Abs(tileV - 1f) > 0.01f)
        {
            go.transform.localScale = Vector3.one;
            Mesh m = CriarMeshCaixaUV(tam, Mathf.Max(0.1f, tileU), Mathf.Max(0.1f, tileV));
            RegistrarMesh(m);
            go.AddComponent<MeshFilter>().sharedMesh = m;
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
            if (comCollider)
            {
                BoxCollider bc = go.AddComponent<BoxCollider>();
                bc.size = tam;
            }
        }
        else
        {
            go.transform.localScale = tam;
            go.AddComponent<MeshFilter>().sharedMesh = ObterCuboUnitario();
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
            if (comCollider) go.AddComponent<BoxCollider>();
        }
        return go;
    }

    internal GameObject CriarCilindro(string nome, Transform pai, Vector3 pos, float diam, float alt, Material mat, bool comCollider, int lados = 12)
    {
        GameObject go = new GameObject(nome);
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;
        go.transform.localScale = new Vector3(diam, alt, diam);

        go.AddComponent<MeshFilter>().sharedMesh = ObterCilindroUnitario(Mathf.Clamp(lados, 5, 24));
        go.AddComponent<MeshRenderer>().sharedMaterial = mat;
        if (comCollider) go.AddComponent<CapsuleCollider>();
        return go;
    }

    internal GameObject CriarEsfera(string nome, Transform pai, Vector3 pos, float diam, Material mat, bool comCollider)
    {
        GameObject go = new GameObject(nome);
        go.transform.SetParent(pai, false);
        go.transform.localPosition = pos;
        go.transform.localScale = Vector3.one * diam;

        go.AddComponent<MeshFilter>().sharedMesh = ObterEsferaUnitaria();
        go.AddComponent<MeshRenderer>().sharedMaterial = mat;
        if (comCollider) go.AddComponent<SphereCollider>();
        return go;
    }

    private Mesh ObterCuboUnitario()
    {
        if (meshCuboUnitario != null) return meshCuboUnitario;
        meshCuboUnitario = CriarMeshCaixaUV(Vector3.one, 1f, 1f);
        meshCuboUnitario.name = "Cidade_CuboUnitario";
        return meshCuboUnitario;
    }

    private static Mesh CriarMeshCaixaUV(Vector3 tam, float tileU, float tileV)
    {
        float hx = tam.x * 0.5f;
        float hy = tam.y * 0.5f;
        float hz = tam.z * 0.5f;

        Vector3[] v = new Vector3[24];
        Vector3[] n = new Vector3[24];
        Vector2[] uv = new Vector2[24];
        int[] t = new int[36];

        void Face(int fi, Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector3 norm, float w, float h)
        {
            int o = fi * 4;
            v[o] = a; v[o + 1] = b; v[o + 2] = c; v[o + 3] = d;
            n[o] = n[o + 1] = n[o + 2] = n[o + 3] = norm;
            float uM = w / tileU;
            float vM = h / tileV;
            uv[o] = new Vector2(0f, 0f); uv[o + 1] = new Vector2(0f, vM);
            uv[o + 2] = new Vector2(uM, vM); uv[o + 3] = new Vector2(uM, 0f);
            int to = fi * 6;
            t[to] = o; t[to + 1] = o + 1; t[to + 2] = o + 2;
            t[to + 3] = o; t[to + 4] = o + 2; t[to + 5] = o + 3;
        }

        // Frente (-Z), Trás (+Z), Direita (+X), Esquerda (-X), Topo (+Y), Base (-Y)
        Face(0, new Vector3(-hx, -hy, -hz), new Vector3(-hx, hy, -hz), new Vector3(hx, hy, -hz), new Vector3(hx, -hy, -hz), Vector3.back, tam.x, tam.y);
        Face(1, new Vector3(hx, -hy, hz), new Vector3(hx, hy, hz), new Vector3(-hx, hy, hz), new Vector3(-hx, -hy, hz), Vector3.forward, tam.x, tam.y);
        Face(2, new Vector3(hx, -hy, -hz), new Vector3(hx, hy, -hz), new Vector3(hx, hy, hz), new Vector3(hx, -hy, hz), Vector3.right, tam.z, tam.y);
        Face(3, new Vector3(-hx, -hy, hz), new Vector3(-hx, hy, hz), new Vector3(-hx, hy, -hz), new Vector3(-hx, -hy, -hz), Vector3.left, tam.z, tam.y);
        Face(4, new Vector3(-hx, hy, -hz), new Vector3(-hx, hy, hz), new Vector3(hx, hy, hz), new Vector3(hx, hy, -hz), Vector3.up, tam.x, tam.z);
        Face(5, new Vector3(-hx, -hy, hz), new Vector3(-hx, -hy, -hz), new Vector3(hx, -hy, -hz), new Vector3(hx, -hy, hz), Vector3.down, tam.x, tam.z);

        Mesh m = new Mesh { name = "Cidade_CaixaUV" };
        m.vertices = v;
        m.normals = n;
        m.uv = uv;
        m.triangles = t;
        m.RecalculateBounds();
        return m;
    }

    private Mesh ObterCilindroUnitario(int lados)
    {
        if (cacheCilindros.TryGetValue(lados, out Mesh existente) && existente != null)
            return existente;

        List<Vector3> verts = new List<Vector3>();
        List<Vector2> uvs = new List<Vector2>();
        List<int> tris = new List<int>();

        float r = 0.5f;
        float hy = 0.5f;

        for (int i = 0; i <= lados; i++)
        {
            float a = (i / (float)lados) * Mathf.PI * 2f;
            float cx = Mathf.Cos(a) * r;
            float cz = Mathf.Sin(a) * r;
            verts.Add(new Vector3(cx, -hy, cz));
            verts.Add(new Vector3(cx, hy, cz));
            uvs.Add(new Vector2(i / (float)lados, 0f));
            uvs.Add(new Vector2(i / (float)lados, 1f));
        }

        for (int i = 0; i < lados; i++)
        {
            int b0 = i * 2, t0 = b0 + 1, b1 = b0 + 2, t1 = b0 + 3;
            tris.Add(b0); tris.Add(t0); tris.Add(t1);
            tris.Add(b0); tris.Add(t1); tris.Add(b1);
        }

        int centroTopo = verts.Count;
        verts.Add(new Vector3(0f, hy, 0f)); uvs.Add(new Vector2(0.5f, 0.5f));
        int centroBase = verts.Count;
        verts.Add(new Vector3(0f, -hy, 0f)); uvs.Add(new Vector2(0.5f, 0.5f));

        for (int i = 0; i < lados; i++)
        {
            int t0 = i * 2 + 1, t1 = ((i + 1) % lados) * 2 + 1;
            tris.Add(centroTopo); tris.Add(t1); tris.Add(t0);

            int b0 = i * 2, b1 = ((i + 1) % lados) * 2;
            tris.Add(centroBase); tris.Add(b0); tris.Add(b1);
        }

        Mesh m = new Mesh { name = $"Cidade_Cilindro_{lados}" };
        m.SetVertices(verts);
        m.SetUVs(0, uvs);
        m.SetTriangles(tris, 0);
        m.RecalculateNormals();
        m.RecalculateBounds();
        cacheCilindros[lados] = m;
        return m;
    }

    private Mesh ObterEsferaUnitaria()
    {
        if (meshEsferaUnitaria != null) return meshEsferaUnitaria;
        GameObject tmp = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        meshEsferaUnitaria = Instantiate(tmp.GetComponent<MeshFilter>().sharedMesh);
        meshEsferaUnitaria.name = "Cidade_EsferaUnitaria";
        if (Application.isPlaying) Destroy(tmp);
        else DestroyImmediate(tmp);
        return meshEsferaUnitaria;
    }
}