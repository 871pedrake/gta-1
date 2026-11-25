using System.Collections.Generic;
using UnityEngine;

public partial class GeradorCidadeInicial
{
    [System.NonSerialized] internal int indiceRioResolvido;

    // ============================================================
    // GEOMETRIA ANALÍTICA DO RIO (CORREDOR RETO + MEANDRO/ESTUÁRIO)
    // ============================================================
    private void ResolverIndiceRio()
    {
        int totalFaixas = eixoRio == EixoRio.LesteOeste_X ? quadrasZ : quadrasX;
        int centro = totalFaixas / 2;

        if (totalFaixas <= 1)
        {
            indiceRioResolvido = 0;
            return;
        }

        int candidato = indiceQuadraRio >= 0 ? Mathf.Clamp(indiceQuadraRio, 0, totalFaixas - 1) : (centro + 1 < totalFaixas ? centro + 1 : centro - 1);
        if (candidato == centro)
            candidato = centro > 0 ? centro - 1 : centro + 1;

        indiceRioResolvido = candidato;
    }

    internal bool QuadraEhCorredorRio(int gx, int gz)
    {
        if (!criarRio) return false;
        return eixoRio == EixoRio.LesteOeste_X ? gz == indiceRioResolvido : gx == indiceRioResolvido;
    }

    internal bool AdjacenteAoRio(int gx, int gz)
    {
        if (!criarRio) return false;
        return eixoRio == EixoRio.LesteOeste_X
            ? Mathf.Abs(gz - indiceRioResolvido) == 1
            : Mathf.Abs(gx - indiceRioResolvido) == 1;
    }

    private float CoordCentroRioBase()
    {
        float baseCoord = eixoRio == EixoRio.LesteOeste_X
            ? CentroQuadraZ(indiceRioResolvido)
            : CentroQuadraX(indiceRioResolvido);
        float offset = eixoRio == EixoRio.LesteOeste_X ? posRio.z : posRio.x;
        float maxDesloc = Mathf.Max(0f, (tamanhoQuadra - larguraRio) * 0.35f);
        return baseCoord + Mathf.Clamp(offset, -maxDesloc, maxDesloc);
    }

    private float MeiaExtensaoCidadeNoEixoRio() =>
        (eixoRio == EixoRio.LesteOeste_X ? larguraTotal : comprimentoTotal) * 0.5f;

    internal float CentroRioEm(float s)
    {
        float centro = CoordCentroRioBase();
        float meiaCidade = MeiaExtensaoCidadeNoEixoRio();
        float fora = Mathf.Max(0f, Mathf.Abs(s) - meiaCidade);
        if (fora <= 0.001f) return centro;

        // Curva suave de meandro fora da grade urbana
        float t = Mathf.Clamp01(fora / 28f);
        float curvaSuave = t * t * (3f - 2f * t);
        float sinal = s >= 0f ? 1f : -1f;
        float meandro = Mathf.Sin(fora * 0.075f + seedAleatoria * 0.3f) * 10f
                      + (ValueNoise(Mathf.RoundToInt(s * 0.5f), 17, 64, 8, seedAleatoria + 91) - 0.5f) * 8f;
        return centro + curvaSuave * meandro * sinal;
    }

    internal float MeiaLarguraRioEm(float s)
    {
        float meiaBase = Mathf.Clamp(larguraRio, 6f, tamanhoQuadra - 6f) * 0.5f;
        float meiaCidade = MeiaExtensaoCidadeNoEixoRio();
        float fora = Mathf.Max(0f, Mathf.Abs(s) - meiaCidade);
        if (fora <= 0.001f) return meiaBase;

        float t = Mathf.Clamp01(fora / Mathf.Max(20f, extensaoMeandroRio * 0.7f));
        float suave = t * t * (3f - 2f * t);
        return Mathf.Lerp(meiaBase, meiaBase * fatorEstuario, suave);
    }

    internal bool RetanguloSobreRio(float cx, float cz, float sx, float sz)
    {
        float s = eixoRio == EixoRio.LesteOeste_X ? cx : cz;
        float t = eixoRio == EixoRio.LesteOeste_X ? cz : cx;
        float meiaT = (eixoRio == EixoRio.LesteOeste_X ? sz : sx) * 0.5f;

        float centro = CentroRioEm(s);
        float meiaLarg = MeiaLarguraRioEm(s);
        return Mathf.Abs(t - centro) < (meiaLarg + meiaT + 0.35f);
    }

    private Vector3 PontoRioMundo(float s, float offsetTransversal, float y)
    {
        float c = CentroRioEm(s) + offsetTransversal;
        return eixoRio == EixoRio.LesteOeste_X ? new Vector3(s, y, c) : new Vector3(c, y, s);
    }

    // ============================================================
    // RIO, LEITO, MARGENS, ÁGUA 2 CAMADAS E TRIGGER
    // ============================================================
    private void GerarRio(Transform raiz)
    {
        GameObject grupoRio = new GameObject("Rio_Sistema");
        grupoRio.transform.SetParent(raiz, false);

        float meiaCidade = MeiaExtensaoCidadeNoEixoRio();
        float sMin = -meiaCidade - extensaoMeandroRio;
        float sMax = meiaCidade + extensaoMeandroRio;

        int segmentos = presetQualidade == PresetQualidade.Leve ? 36 : (presetQualidade == PresetQualidade.Medio ? 56 : 80);
        float passo = (sMax - sMin) / segmentos;

        float yAsfalto = TopoAsfalto;
        float yLeito = yAsfalto - profundidadeRio;
        float yAgua = NivelAgua;

        Material matPedra = MatCor(new Color(0.36f, 0.35f, 0.33f), 0.1f);
        Material matLeito = MatCor(new Color(0.22f, 0.20f, 0.16f), 0.05f);
        Material matTerra = MatCor(new Color(0.38f, 0.29f, 0.20f), 0.02f);
        Material matGrama = MatGrama();

        // 1) Leito contínuo em malha + collider no fundo para ninguém cair no vazio
        CriarMalhaFaixaRio("Leito_Rio", grupoRio.transform, sMin, sMax, segmentos, 1.35f, yLeito, matLeito, true);

        // 2) Muros de contenção dentro da cidade & margens naturais de terra/grama/vegetação fora
        for (int i = 0; i < segmentos; i++)
        {
            float s0 = sMin + i * passo;
            float s1 = s0 + passo;
            float sMed = (s0 + s1) * 0.5f;
            float c0 = CentroRioEm(s0);
            float c1 = CentroRioEm(s1);
            float ml0 = MeiaLarguraRioEm(s0);
            float ml1 = MeiaLarguraRioEm(s1);

            bool dentroCidade = Mathf.Abs(sMed) <= meiaCidade + 0.5f;
            Vector3 pA = PontoRioMundo(s0, 0f, 0f);
            Vector3 pB = PontoRioMundo(s1, 0f, 0f);
            Vector3 dir = (pB - pA).normalized;
            float comp = Vector3.Distance(pA, pB) + 0.08f;
            Quaternion rot = Quaternion.LookRotation(dir, Vector3.up);

            for (int lado = -1; lado <= 1; lado += 2)
            {
                float offMed = lado * ((ml0 + ml1) * 0.5f);
                Vector3 posMuro = Vector3.Lerp(PontoRioMundo(s0, lado * ml0, 0f), PontoRioMundo(s1, lado * ml1, 0f), 0.5f);

                if (dentroCidade)
                {
                    // Muro de contenção em concreto/pedra até o nível da orla
                    float altMuro = profundidadeRio + TopoCalcada(false) + 0.15f;
                    GameObject muro = CriarCaixa("Muro_Contencao", grupoRio.transform,
                        new Vector3(posMuro.x, yLeito + altMuro * 0.5f, posMuro.z),
                        new Vector3(0.65f, altMuro, comp), matPedra, 2f, 2f, false, true);
                    muro.transform.localRotation = rot;
                }
                else
                {
                    // Margem externa inclinada: terra na beira, grama e vegetação subindo
                    Vector3 perp = Vector3.Cross(Vector3.up, dir).normalized * lado;
                    GameObject barranco = CriarCaixa("Margem_Terra", grupoRio.transform,
                        posMuro + perp * 2.2f + Vector3.up * (yLeito + profundidadeRio * 0.45f),
                        new Vector3(5.2f, 0.7f, comp + 0.2f), matTerra, 3f, 3f, false, true);
                    barranco.transform.localRotation = rot * Quaternion.Euler(0f, 0f, -lado * 24f);

                    GameObject gramaMargem = CriarCaixa("Margem_Grama", grupoRio.transform,
                        posMuro + perp * 8.5f + Vector3.up * (yAsfalto - 0.18f),
                        new Vector3(9.5f, 0.5f, comp + 0.2f), matGrama, metrosPorTexturaGrama, metrosPorTexturaGrama, false, true);
                    gramaMargem.transform.localRotation = rot;

                    if (UnityEngine.Random.value < 0.45f)
                        CriarArvoreSimples(grupoRio.transform, posMuro + perp * UnityEngine.Random.Range(5.5f, 11.5f) + Vector3.up * (yAsfalto + 0.05f), i * 2 + (lado > 0 ? 1 : 0));
                }
            }
        }

        // 3) Água em 2 camadas animadas + espuma nas margens (não combinar)
        Material matTurva = MatAguaTurva();
        GameObject camadaTurva = CriarMalhaFaixaRio("ANIM_Agua_CamadaTurva", grupoRio.transform, sMin, sMax, segmentos, 1.04f, yAgua - 0.20f, matTurva, false);
        RegistrarObjetoDinamico(camadaTurva);
        var animTurva = camadaTurva.AddComponent<CidadeAguaAnimada>();
        animTurva.Configurar(matTurva, new Vector2(0.03f, 0.015f) * velocidadeAgua, new Color(0.07f, 0.24f, 0.28f, 1f));

        Material matSup = MatAguaSuperficie("agua_rio_superficie");
        GameObject camadaSup = CriarMalhaFaixaRio("ANIM_Agua_Superficie", grupoRio.transform, sMin, sMax, segmentos, 1.02f, yAgua, matSup, false);
        RegistrarObjetoDinamico(camadaSup);
        var animSup = camadaSup.AddComponent<CidadeAguaAnimada>();
        animSup.Configurar(matSup, new Vector2(0.075f, -0.025f) * velocidadeAgua, new Color(0.14f, 0.54f, 0.66f, 0.70f));

        Material matEsp = MatEspuma();
        for (int lado = -1; lado <= 1; lado += 2)
        {
            GameObject espuma = CriarMalhaEspumaMargem($"ANIM_Espuma_{(lado < 0 ? "E" : "D")}", grupoRio.transform, sMin, sMax, segmentos, lado, yAgua + 0.025f, matEsp);
            RegistrarObjetoDinamico(espuma);
            var animEsp = espuma.AddComponent<CidadeAguaAnimada>();
            animEsp.Configurar(matEsp, new Vector2(0.09f * lado, 0.02f) * velocidadeAgua, new Color(0.92f, 0.97f, 1f, 0.60f));
        }

        // 4) Volume Trigger com layer/tag "Agua" e eventos públicos OnEnter/OnExit
        GameObject trig = new GameObject("Volume_Agua_Trigger");
        trig.transform.SetParent(grupoRio.transform, false);
        float cMedio = CoordCentroRioBase();
        float altTrig = (yAgua - yLeito) + 0.25f;
        trig.transform.localPosition = eixoRio == EixoRio.LesteOeste_X
            ? new Vector3(0f, yLeito + altTrig * 0.5f, cMedio)
            : new Vector3(cMedio, yLeito + altTrig * 0.5f, 0f);
        BoxCollider bcTrig = trig.AddComponent<BoxCollider>();
        bcTrig.isTrigger = true;
        float largMaxTrig = larguraRio * fatorEstuario + 16f;
        bcTrig.size = eixoRio == EixoRio.LesteOeste_X
            ? new Vector3(sMax - sMin, altTrig, largMaxTrig)
            : new Vector3(largMaxTrig, altTrig, sMax - sMin);
        TentarAplicarTagELayerAgua(trig);
        trig.AddComponent<CidadeTriggerAgua>();

        if (combinarMalhasPorDistrito)
            CombinarGrupoEstatico(grupoRio.transform, "Rio");
    }

    private GameObject CriarMalhaFaixaRio(string nome, Transform pai, float sMin, float sMax, int segs, float escalaLarg, float y, Material mat, bool comCollider)
    {
        List<Vector3> verts = new List<Vector3>((segs + 1) * 2);
        List<Vector3> norms = new List<Vector3>((segs + 1) * 2);
        List<Vector2> uvs = new List<Vector2>((segs + 1) * 2);
        List<int> tris = new List<int>(segs * 6);

        float passo = (sMax - sMin) / segs;
        for (int i = 0; i <= segs; i++)
        {
            float s = sMin + i * passo;
            float meia = MeiaLarguraRioEm(s) * escalaLarg;
            verts.Add(PontoRioMundo(s, -meia, y));
            verts.Add(PontoRioMundo(s, meia, y));
            norms.Add(Vector3.up);
            norms.Add(Vector3.up);
            float u = (s - sMin) / 14f;
            uvs.Add(new Vector2(u, 0f));
            uvs.Add(new Vector2(u, 1f));
        }

        for (int i = 0; i < segs; i++)
        {
            int a = i * 2, b = a + 1, c = a + 2, d = a + 3;
            if (eixoRio == EixoRio.LesteOeste_X)
            {
                tris.Add(a); tris.Add(b); tris.Add(d);
                tris.Add(a); tris.Add(d); tris.Add(c);
            }
            else
            {
                tris.Add(a); tris.Add(d); tris.Add(b);
                tris.Add(a); tris.Add(c); tris.Add(d);
            }
        }

        Mesh m = new Mesh { name = nome };
        m.SetVertices(verts);
        m.SetNormals(norms);
        m.SetUVs(0, uvs);
        m.SetTriangles(tris, 0);
        m.RecalculateBounds();
        RegistrarMesh(m);

        GameObject go = new GameObject(nome);
        go.transform.SetParent(pai, false);
        go.AddComponent<MeshFilter>().sharedMesh = m;
        go.AddComponent<MeshRenderer>().sharedMaterial = mat;
        if (comCollider)
            go.AddComponent<MeshCollider>().sharedMesh = m;
        return go;
    }

    private GameObject CriarMalhaEspumaMargem(string nome, Transform pai, float sMin, float sMax, int segs, int lado, float y, Material mat)
    {
        List<Vector3> verts = new List<Vector3>();
        List<Vector3> norms = new List<Vector3>();
        List<Vector2> uvs = new List<Vector2>();
        List<int> tris = new List<int>();

        float passo = (sMax - sMin) / segs;
        for (int i = 0; i <= segs; i++)
        {
            float s = sMin + i * passo;
            float meia = MeiaLarguraRioEm(s);
            float offA = lado * (meia - 0.9f);
            float offB = lado * (meia + 0.1f);
            verts.Add(PontoRioMundo(s, Mathf.Min(offA, offB), y));
            verts.Add(PontoRioMundo(s, Mathf.Max(offA, offB), y));
            norms.Add(Vector3.up);
            norms.Add(Vector3.up);
            float u = (s - sMin) / 6f;
            uvs.Add(new Vector2(u, 0f));
            uvs.Add(new Vector2(u, 1f));
        }

        for (int i = 0; i < segs; i++)
        {
            int a = i * 2, b = a + 1, c = a + 2, d = a + 3;
            if (eixoRio == EixoRio.LesteOeste_X)
            {
                tris.Add(a); tris.Add(b); tris.Add(d);
                tris.Add(a); tris.Add(d); tris.Add(c);
            }
            else
            {
                tris.Add(a); tris.Add(d); tris.Add(b);
                tris.Add(a); tris.Add(c); tris.Add(d);
            }
        }

        Mesh m = new Mesh { name = nome };
        m.SetVertices(verts);
        m.SetNormals(norms);
        m.SetUVs(0, uvs);
        m.SetTriangles(tris, 0);
        m.RecalculateBounds();
        RegistrarMesh(m);

        GameObject go = new GameObject(nome);
        go.transform.SetParent(pai, false);
        go.AddComponent<MeshFilter>().sharedMesh = m;
        go.AddComponent<MeshRenderer>().sharedMaterial = mat;
        return go;
    }

    private static void TentarAplicarTagELayerAgua(GameObject go)
    {
        try { go.tag = "Agua"; } catch { }
        int layer = LayerMask.NameToLayer("Agua");
        if (layer >= 0) go.layer = layer;
    }

    // ============================================================
    // ORLA, CALÇADÃO, QUIOSQUES, ESCADAS, BICICLETÁRIO E PÍER
    // ============================================================
    private void GerarOrla(Transform raiz)
    {
        GameObject grupoOrla = new GameObject("Orla_Cais");
        grupoOrla.transform.SetParent(raiz, false);

        float altCalc = TopoCalcada(false);
        float cRio = CoordCentroRioBase();
        float meiaRio = MeiaLarguraRioEm(0f);
        float cFaixa = eixoRio == EixoRio.LesteOeste_X ? CentroQuadraZ(indiceRioResolvido) : CentroQuadraX(indiceRioResolvido);
        float bordaMin = cFaixa - tamanhoQuadra * 0.5f;
        float bordaMax = cFaixa + tamanhoQuadra * 0.5f;

        int numQuadras = eixoRio == EixoRio.LesteOeste_X ? quadrasX : quadrasZ;
        Material matCalc = MatCalcada();
        Material matMadeira = MatMadeira();
        Material matFerro = MatCor(new Color(0.16f, 0.22f, 0.26f), 0.45f);
        Material matQuiosque = MatCor(new Color(0.92f, 0.54f, 0.24f), 0.18f);

        bool pierCriado = false;

        for (int g = 0; g < numQuadras; g++)
        {
            float sCentro = eixoRio == EixoRio.LesteOeste_X ? CentroQuadraX(g) : CentroQuadraZ(g);

            for (int lado = -1; lado <= 1; lado += 2)
            {
                float rEdge = cRio + lado * meiaRio;
                float qEdge = lado < 0 ? bordaMin : bordaMax;
                float largCalcadao = Mathf.Abs(qEdge - rEdge);
                if (largCalcadao < 2.2f) continue;

                float tCentro = (rEdge + qEdge) * 0.5f;
                Vector3 posCalc = eixoRio == EixoRio.LesteOeste_X
                    ? new Vector3(sCentro, altCalc * 0.5f, tCentro)
                    : new Vector3(tCentro, altCalc * 0.5f, sCentro);
                Vector3 tamCalc = eixoRio == EixoRio.LesteOeste_X
                    ? new Vector3(tamanhoQuadra, altCalc, largCalcadao)
                    : new Vector3(largCalcadao, altCalc, tamanhoQuadra);

                CriarCaixa($"Calcadao_{g}_{lado}", grupoOrla.transform, posCalc, tamCalc,
                    matCalc, metrosPorTexturaCalcada, metrosPorTexturaCalcada, false, true);

                // Guarda-corpo na beira da água
                float tGuarda = rEdge + lado * 0.25f;
                Vector3 posGuarda = eixoRio == EixoRio.LesteOeste_X
                    ? new Vector3(sCentro, altCalc + 0.5f, tGuarda)
                    : new Vector3(tGuarda, altCalc + 0.5f, sCentro);
                Vector3 tamGuarda = eixoRio == EixoRio.LesteOeste_X
                    ? new Vector3(tamanhoQuadra - 2.4f, 0.08f, 0.08f)
                    : new Vector3(0.08f, 0.08f, tamanhoQuadra - 2.4f);
                CriarCaixa("GuardaCorpo_Barra", grupoOrla.transform, posGuarda + Vector3.up * 0.45f, tamGuarda, matFerro, 1f, 1f, false, true);

                for (int p = -3; p <= 3; p++)
                {
                    float sPoste = sCentro + p * (tamanhoQuadra * 0.13f);
                    Vector3 posPilar = eixoRio == EixoRio.LesteOeste_X
                        ? new Vector3(sPoste, altCalc + 0.48f, tGuarda)
                        : new Vector3(tGuarda, altCalc + 0.48f, sPoste);
                    CriarCaixa("Pilar_GC", grupoOrla.transform, posPilar, new Vector3(0.08f, 0.96f, 0.08f), matFerro, 1f, 1f, false, false);
                }

                // Palmeiras, bancos, postes ornamentais
                float tMob = rEdge + lado * Mathf.Min(1.6f, largCalcadao * 0.45f);
                Vector3 basePalm = eixoRio == EixoRio.LesteOeste_X
                    ? new Vector3(sCentro - tamanhoQuadra * 0.3f, altCalc, tMob)
                    : new Vector3(tMob, altCalc, sCentro - tamanhoQuadra * 0.3f);
                CriarPalmeira(grupoOrla.transform, basePalm);

                Vector3 basePoste = eixoRio == EixoRio.LesteOeste_X
                    ? new Vector3(sCentro + tamanhoQuadra * 0.3f, altCalc, tMob)
                    : new Vector3(tMob, altCalc, sCentro + tamanhoQuadra * 0.3f);
                CriarPosteOrnamental(grupoOrla.transform, basePoste);

                // Banco olhando para o rio
                GameObject banco = new GameObject($"Banco_Orla_{g}_{lado}");
                banco.transform.SetParent(grupoOrla.transform, false);
                banco.transform.localPosition = eixoRio == EixoRio.LesteOeste_X
                    ? new Vector3(sCentro, altCalc, tMob)
                    : new Vector3(tMob, altCalc, sCentro);
                banco.transform.localRotation = eixoRio == EixoRio.LesteOeste_X
                    ? Quaternion.Euler(0f, lado > 0 ? 180f : 0f, 0f)
                    : Quaternion.Euler(0f, lado > 0 ? -90f : 90f, 0f);
                CriarBanco(banco.transform);

                // Quiosque em quadras alternadas
                if ((g + (lado > 0 ? 1 : 0)) % 2 == 0 && largCalcadao >= 3.2f)
                {
                    float tQui = rEdge + lado * (largCalcadao * 0.65f);
                    Vector3 posQui = eixoRio == EixoRio.LesteOeste_X
                        ? new Vector3(sCentro + 4f, altCalc, tQui)
                        : new Vector3(tQui, altCalc, sCentro + 4f);
                    CriarQuiosque(grupoOrla.transform, posQui, matQuiosque, matMadeira);
                }

                // Escada até a água em algumas quadras
                if (g % 2 == 1 && lado == -1)
                    CriarEscadaAgua(grupoOrla.transform, sCentro - 5f, rEdge, lado, altCalc, matMadeira);

                // Bicicletário
                if (g == numQuadras / 2 && lado == 1)
                {
                    Vector3 posBici = eixoRio == EixoRio.LesteOeste_X
                        ? new Vector3(sCentro - 5f, altCalc, tMob)
                        : new Vector3(tMob, altCalc, sCentro - 5f);
                    CriarBicicletario(grupoOrla.transform, posBici, matFerro);
                }

                // Píer principal se projetando sobre o rio
                if (!pierCriado && g == Mathf.Clamp(numQuadras / 2, 0, numQuadras - 1) && lado == -1)
                {
                    pierCriado = true;
                    CriarPier(grupoOrla.transform, sCentro, rEdge, lado, matMadeira);
                }
            }
        }

        if (combinarMalhasPorDistrito)
            CombinarGrupoEstatico(grupoOrla.transform, "Orla");
    }

    private void CriarPalmeira(Transform pai, Vector3 basePos)
    {
        GameObject p = new GameObject("Palmeira");
        p.transform.SetParent(pai, false);
        p.transform.localPosition = basePos;

        float alt = UnityEngine.Random.Range(4.8f, 6.6f);
        float inclX = UnityEngine.Random.Range(-0.4f, 0.4f);
        float inclZ = UnityEngine.Random.Range(-0.4f, 0.4f);

        int segs = 4;
        Vector3 topo = Vector3.zero;
        for (int i = 0; i < segs; i++)
        {
            float t = (i + 0.5f) / segs;
            Vector3 segPos = new Vector3(inclX * t * t, t * alt, inclZ * t * t);
            GameObject seg = CriarCilindro($"Tronco_{i}", p.transform, segPos, 0.34f - i * 0.04f, alt / segs + 0.1f, MatTronco(), i == 0, 6);
            seg.transform.localRotation = Quaternion.Euler(inclZ * 10f * t, 0f, -inclX * 10f * t);
            topo = new Vector3(inclX, alt, inclZ);
        }

        Material matFolha = MatCopa();
        for (int f = 0; f < 6; f++)
        {
            float ang = f * 60f + UnityEngine.Random.Range(-10f, 10f);
            GameObject folha = CriarCaixa($"Folha_{f}", p.transform, topo, new Vector3(0.45f, 0.06f, 2.3f), matFolha, 1f, 1f, false, false);
            folha.transform.localRotation = Quaternion.Euler(22f, ang, 0f);
            folha.transform.localPosition += folha.transform.forward * 1.05f;
        }
    }

    private void CriarPosteOrnamental(Transform pai, Vector3 basePos)
    {
        GameObject p = new GameObject("Poste_Ornamental");
        p.transform.SetParent(pai, false);
        p.transform.localPosition = basePos;

        Material matFerro = MatCor(new Color(0.14f, 0.16f, 0.18f), 0.5f);
        CriarCilindro("Base", p.transform, new Vector3(0f, 0.35f, 0f), 0.32f, 0.7f, matFerro, true, 8);
        CriarCilindro("Haste", p.transform, new Vector3(0f, 2.1f, 0f), 0.14f, 3.6f, matFerro, false, 8);
        CriarEsfera("Globo_Lampada", p.transform, new Vector3(0f, 4.05f, 0f), 0.42f, MatLampada(), false);
    }

    private void CriarQuiosque(Transform pai, Vector3 basePos, Material matTeto, Material matMad)
    {
        GameObject q = new GameObject("Quiosque");
        q.transform.SetParent(pai, false);
        q.transform.localPosition = basePos;

        CriarCaixa("Balcao", q.transform, new Vector3(0f, 0.55f, 0f), new Vector3(2.8f, 1.1f, 1.8f), matMad, 1f, 1f, false, true);
        CriarCaixa("Teto", q.transform, new Vector3(0f, 2.45f, 0f), new Vector3(3.6f, 0.22f, 2.6f), matTeto, 1f, 1f, false, true);
        for (int sx = -1; sx <= 1; sx += 2)
            for (int sz = -1; sz <= 1; sz += 2)
                CriarCilindro("Pilar", q.transform, new Vector3(sx * 1.25f, 1.75f, sz * 0.75f), 0.12f, 1.3f, matMad, false, 6);
    }

    private void CriarEscadaAgua(Transform pai, float sPos, float rEdge, int lado, float altCalc, Material matMad)
    {
        float yAgua = NivelAgua + 0.22f;
        int degraus = 6;
        for (int d = 0; d < degraus; d++)
        {
            float t = (float)d / (degraus - 1);
            float y = Mathf.Lerp(altCalc - 0.1f, yAgua, t);
            float distAgua = -lado * (0.4f + t * 1.8f);
            Vector3 pos = eixoRio == EixoRio.LesteOeste_X
                ? new Vector3(sPos, y, rEdge + distAgua)
                : new Vector3(rEdge + distAgua, y, sPos);
            Vector3 tam = eixoRio == EixoRio.LesteOeste_X ? new Vector3(2.2f, 0.16f, 0.42f) : new Vector3(0.42f, 0.16f, 2.2f);
            CriarCaixa($"Degrau_{d}", pai, pos, tam, matMad, 1f, 1f, false, true);
        }
    }

    private void CriarBicicletario(Transform pai, Vector3 basePos, Material matFerro)
    {
        GameObject b = new GameObject("Bicicletario");
        b.transform.SetParent(pai, false);
        b.transform.localPosition = basePos;

        for (int i = 0; i < 4; i++)
        {
            float x = (i - 1.5f) * 0.75f;
            CriarCaixa($"Arco_{i}", b.transform, new Vector3(x, 0.35f, 0f), new Vector3(0.06f, 0.7f, 0.6f), matFerro, 1f, 1f, false, true);
        }
        CriarCaixa("Base_Trilho", b.transform, new Vector3(0f, 0.03f, 0f), new Vector3(3.0f, 0.06f, 0.8f), matFerro, 1f, 1f, false, false);
    }

    private void CriarPier(Transform pai, float sCentro, float rEdge, int lado, Material matMad)
    {
        GameObject pier = new GameObject("Pier_Principal");
        pier.transform.SetParent(pai, false);

        float compPier = Mathf.Clamp(larguraRio * 0.42f, 4.5f, 7.5f);
        float largPier = 4.2f;
        float yDeck = NivelAgua + 0.48f;
        float dirAgua = -lado; // em direção ao centro do rio

        Vector3 posDeck = eixoRio == EixoRio.LesteOeste_X
            ? new Vector3(sCentro, yDeck, rEdge + dirAgua * (compPier * 0.5f))
            : new Vector3(rEdge + dirAgua * (compPier * 0.5f), yDeck, sCentro);
        Vector3 tamDeck = eixoRio == EixoRio.LesteOeste_X
            ? new Vector3(largPier, 0.24f, compPier)
            : new Vector3(compPier, 0.24f, largPier);

        CriarCaixa("Deck_Pier", pier.transform, posDeck, tamDeck, matMad, 2f, 2f, false, true);

        // Estacas de sustentação até o leito
        float altEstaca = (yDeck - (TopoAsfalto - profundidadeRio)) + 0.4f;
        Material matPoste = MatCor(new Color(0.28f, 0.20f, 0.12f), 0.1f);
        for (int a = -1; a <= 1; a += 2)
        {
            for (int b = 1; b <= 2; b++)
            {
                float d = (b / 2f) * (compPier - 0.5f);
                Vector3 pEst = eixoRio == EixoRio.LesteOeste_X
                    ? new Vector3(sCentro + a * (largPier * 0.42f), yDeck - altEstaca * 0.5f + 0.35f, rEdge + dirAgua * d)
                    : new Vector3(rEdge + dirAgua * d, yDeck - altEstaca * 0.5f + 0.35f, sCentro + a * (largPier * 0.42f));
                CriarCilindro("Estaca_Pier", pier.transform, pEst, 0.28f, altEstaca + 0.7f, matPoste, true, 8);
            }
        }
    }

    // ============================================================
    // PONTES (ESTAIADA GRANDE, FERRO, CONCRETO E PASSARELA)
    // ============================================================
    private void GerarPontes(Transform raiz)
    {
        GameObject grupoPontes = new GameObject("Pontes_Rio");
        grupoPontes.transform.SetParent(raiz, false);

        int numRuas = eixoRio == EixoRio.LesteOeste_X ? quadrasX + 1 : quadrasZ + 1;
        int ruaCentral = numRuas / 2;
        int ruaFerro = Mathf.Max(0, ruaCentral - 2);

        for (int k = 0; k < numRuas; k++)
        {
            float sRua = eixoRio == EixoRio.LesteOeste_X ? CentroRuaX(k) : CentroRuaZ(k);
            if (k == ruaCentral)
                CriarPonteEstaiada(grupoPontes.transform, sRua);
            else if (k == ruaFerro)
                CriarPonteFerro(grupoPontes.transform, sRua);
            else
                CriarPonteConcreto(grupoPontes.transform, sRua, k);
        }

        // Passarela dedicada de pedestres entre quadras conectando as duas orlas
        float sPassarela = eixoRio == EixoRio.LesteOeste_X
            ? CentroQuadraX(Mathf.Min(quadrasX - 1, quadrasX / 2 + 1))
            : CentroQuadraZ(Mathf.Min(quadrasZ - 1, quadrasZ / 2 + 1));
        CriarPassarelaPedestres(grupoPontes.transform, sPassarela);

        if (combinarMalhasPorDistrito)
            CombinarGrupoEstatico(grupoPontes.transform, "Pontes");
    }

    private void CriarPonteEstaiada(Transform pai, float sCentro)
    {
        float cRio = CoordCentroRioBase();
        float vao = Mathf.Max(larguraRio + 4f, comprimentoPonteGrande);
        float yDeck = TopoAsfalto + 1.85f;
        float larg = larguraRua + 2.4f;

        GameObject p = new GameObject("Ponte_Estaiada");
        p.transform.SetParent(pai, false);
        p.transform.localPosition = eixoRio == EixoRio.LesteOeste_X ? new Vector3(sCentro, 0f, cRio) : new Vector3(cRio, 0f, sCentro);
        if (eixoRio == EixoRio.NorteSul_Z) p.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);

        Material matAsf = MatAsfalto();
        Material matConc = MatCor(new Color(0.76f, 0.76f, 0.78f), 0.18f);
        Material matCabo = MatCor(new Color(0.85f, 0.87f, 0.90f), 0.6f);
        Material matFaixa = MatCor(new Color(0.95f, 0.84f, 0.25f), 0.1f);

        // Tabuleiro principal + calçadas laterais + guarda-corpos
        CriarCaixa("Tabuleiro", p.transform, new Vector3(0f, yDeck - 0.25f, 0f), new Vector3(larg, 0.5f, vao), matConc, 4f, 4f, false, true);
        CriarCaixa("Asfalto_Ponte", p.transform, new Vector3(0f, yDeck + 0.02f, 0f), new Vector3(larguraRua - 1.2f, 0.06f, vao), matAsf, 4f, 4f, false, false);
        CriarCaixa("Faixa_Central", p.transform, new Vector3(0f, yDeck + 0.06f, 0f), new Vector3(0.22f, 0.02f, vao), matFaixa, 1f, 1f, false, false);

        for (int lado = -1; lado <= 1; lado += 2)
        {
            CriarCaixa("Calcada_Ponte", p.transform, new Vector3(lado * (larg * 0.5f - 0.8f), yDeck + 0.10f, 0f), new Vector3(1.5f, 0.20f, vao), matConc, 2f, 2f, false, true);
            CriarCaixa("GuardaCorpo", p.transform, new Vector3(lado * (larg * 0.5f - 0.08f), yDeck + 0.65f, 0f), new Vector3(0.12f, 0.9f, vao), matConc, 1f, 1f, false, true);
        }

        // Pilares na água
        float altPilar = (yDeck - (TopoAsfalto - profundidadeRio)) + 0.2f;
        for (int zSide = -1; zSide <= 1; zSide += 2)
        {
            for (int xSide = -1; xSide <= 1; xSide += 2)
            {
                CriarCilindro("Pilar_Agua", p.transform,
                    new Vector3(xSide * (larg * 0.4f), yDeck - altPilar * 0.5f, zSide * (vao * 0.22f)),
                    1.0f, altPilar, matConc, true, 10);
            }
        }

        // Pórtico central estaiado + cabos diagonais
        float altTorre = 14f;
        for (int xSide = -1; xSide <= 1; xSide += 2)
        {
            CriarCaixa("Torre_Estaiada", p.transform, new Vector3(xSide * (larg * 0.48f), yDeck + altTorre * 0.5f, 0f),
                new Vector3(0.95f, altTorre, 1.15f), matConc, 2f, 2f, false, true);

            for (int c = 1; c <= 4; c++)
            {
                float zAncora = (c / 4.5f) * (vao * 0.46f);
                for (int dir = -1; dir <= 1; dir += 2)
                {
                    Vector3 topoTorre = new Vector3(xSide * (larg * 0.48f), yDeck + altTorre - 0.8f - (4 - c) * 0.6f, 0f);
                    Vector3 ancora = new Vector3(xSide * (larg * 0.48f), yDeck + 0.3f, dir * zAncora);
                    CriarCaboEntrePontos(p.transform, topoTorre, ancora, 0.07f, matCabo);
                }
            }
        }
        CriarCaixa("Viga_Topo_Torre", p.transform, new Vector3(0f, yDeck + altTorre - 0.6f, 0f), new Vector3(larg * 0.98f, 0.8f, 0.9f), matConc, 2f, 2f, false, false);

        CriarRampasPonte(p.transform, vao, larg, yDeck, matAsf, matConc);
    }

    private void CriarPonteFerro(Transform pai, float sCentro)
    {
        float cRio = CoordCentroRioBase();
        float vao = larguraRio + 4.5f;
        float yDeck = TopoAsfalto + 1.15f;
        float larg = larguraRua + 1.4f;

        GameObject p = new GameObject("Ponte_Ferro");
        p.transform.SetParent(pai, false);
        p.transform.localPosition = eixoRio == EixoRio.LesteOeste_X ? new Vector3(sCentro, 0f, cRio) : new Vector3(cRio, 0f, sCentro);
        if (eixoRio == EixoRio.NorteSul_Z) p.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);

        Material matAsf = MatAsfalto();
        Material matFerro = MatCor(new Color(0.28f, 0.20f, 0.18f), 0.45f);

        CriarCaixa("Tabuleiro_Ferro", p.transform, new Vector3(0f, yDeck - 0.2f, 0f), new Vector3(larg, 0.4f, vao), matFerro, 2f, 2f, false, true);
        CriarCaixa("Asfalto_Ferro", p.transform, new Vector3(0f, yDeck + 0.02f, 0f), new Vector3(larguraRua - 1.2f, 0.05f, vao), matAsf, 4f, 4f, false, false);

        // Treliça metálica lateral
        float altTrelica = 3.2f;
        for (int lado = -1; lado <= 1; lado += 2)
        {
            float x = lado * (larg * 0.5f - 0.15f);
            CriarCaixa("Banzo_Sup", p.transform, new Vector3(x, yDeck + altTrelica, 0f), new Vector3(0.22f, 0.22f, vao), matFerro, 1f, 1f, false, true);
            int nos = 6;
            for (int i = 0; i <= nos; i++)
            {
                float z = -vao * 0.5f + i * (vao / nos);
                CriarCaixa("Montante", p.transform, new Vector3(x, yDeck + altTrelica * 0.5f, z), new Vector3(0.20f, altTrelica, 0.20f), matFerro, 1f, 1f, false, false);
                if (i < nos)
                {
                    float zProx = z + (vao / nos);
                    CriarCaboEntrePontos(p.transform, new Vector3(x, yDeck, z), new Vector3(x, yDeck + altTrelica, zProx), 0.10f, matFerro);
                }
            }
        }

        // Travessas superiores
        for (int i = 1; i <= 3; i++)
        {
            float z = -vao * 0.35f + (i - 1) * (vao * 0.35f);
            CriarCaixa("Travessa_Sup", p.transform, new Vector3(0f, yDeck + altTrelica, z), new Vector3(larg, 0.22f, 0.22f), matFerro, 1f, 1f, false, false);
        }

        CriarRampasPonte(p.transform, vao, larg, yDeck, matAsf, matFerro);
    }

    private void CriarPonteConcreto(Transform pai, float sCentro, int idx)
    {
        float cRio = CoordCentroRioBase();
        float vao = larguraRio + 4.0f;
        float yDeck = TopoAsfalto + 0.95f;
        float larg = larguraRua + 1.4f;

        GameObject p = new GameObject($"Ponte_Concreto_{idx}");
        p.transform.SetParent(pai, false);
        p.transform.localPosition = eixoRio == EixoRio.LesteOeste_X ? new Vector3(sCentro, 0f, cRio) : new Vector3(cRio, 0f, sCentro);
        if (eixoRio == EixoRio.NorteSul_Z) p.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);

        Material matAsf = MatAsfalto();
        Material matConc = MatCor(new Color(0.68f, 0.68f, 0.70f), 0.15f);

        CriarCaixa("Tabuleiro", p.transform, new Vector3(0f, yDeck - 0.2f, 0f), new Vector3(larg, 0.4f, vao), matConc, 2f, 2f, false, true);
        CriarCaixa("Asfalto", p.transform, new Vector3(0f, yDeck + 0.02f, 0f), new Vector3(larguraRua - 1.2f, 0.05f, vao), matAsf, 4f, 4f, false, false);
        for (int lado = -1; lado <= 1; lado += 2)
            CriarCaixa("GuardaCorpo", p.transform, new Vector3(lado * (larg * 0.5f - 0.1f), yDeck + 0.5f, 0f), new Vector3(0.18f, 0.85f, vao), matConc, 1f, 1f, false, true);

        float altPilar = (yDeck - (TopoAsfalto - profundidadeRio)) + 0.2f;
        for (int lado = -1; lado <= 1; lado += 2)
            CriarCilindro("Pilar", p.transform, new Vector3(lado * (larg * 0.36f), yDeck - altPilar * 0.5f, 0f), 0.75f, altPilar, matConc, true, 8);

        CriarRampasPonte(p.transform, vao, larg, yDeck, matAsf, matConc);
    }

    private void CriarPassarelaPedestres(Transform pai, float sCentro)
    {
        float cRio = CoordCentroRioBase();
        float vao = larguraRio + 3.2f;
        float yDeck = TopoAsfalto + 2.4f;
        float larg = 3.2f;

        GameObject p = new GameObject("Passarela_Pedestres");
        p.transform.SetParent(pai, false);
        p.transform.localPosition = eixoRio == EixoRio.LesteOeste_X ? new Vector3(sCentro, 0f, cRio) : new Vector3(cRio, 0f, sCentro);
        if (eixoRio == EixoRio.NorteSul_Z) p.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);

        Material matMadeira = MatMadeira();
        Material matFerro = MatCor(new Color(0.20f, 0.34f, 0.46f), 0.5f);

        CriarCaixa("Tabuleiro_Passarela", p.transform, new Vector3(0f, yDeck, 0f), new Vector3(larg, 0.24f, vao), matMadeira, 2f, 2f, false, true);
        for (int lado = -1; lado <= 1; lado += 2)
            CriarCaixa("Corrimao", p.transform, new Vector3(lado * (larg * 0.5f - 0.08f), yDeck + 0.55f, 0f), new Vector3(0.08f, 0.95f, vao), matFerro, 1f, 1f, false, true);

        CriarRampasPonte(p.transform, vao, larg, yDeck + 0.1f, matMadeira, matFerro);
    }

    private void CriarRampasPonte(Transform paiPonte, float vao, float larg, float yDeck, Material matPiso, Material matBorda)
    {
        float deltaY = Mathf.Max(0.2f, yDeck - TopoAsfalto);
        float compRampa = Mathf.Max(4.5f, deltaY * 4.5f);
        float hip = Mathf.Sqrt(compRampa * compRampa + deltaY * deltaY);
        float ang = Mathf.Atan2(deltaY, compRampa) * Mathf.Rad2Deg;

        for (int dir = -1; dir <= 1; dir += 2)
        {
            float zCentro = dir * (vao * 0.5f + compRampa * 0.5f);
            float yCentro = (yDeck + TopoAsfalto) * 0.5f - 0.15f;
            GameObject rampa = CriarCaixa("Rampa_Acesso", paiPonte, new Vector3(0f, yCentro, zCentro),
                new Vector3(larg, 0.32f, hip + 0.3f), matPiso, 3f, 3f, false, true);
            rampa.transform.localRotation = Quaternion.Euler(dir * ang, 0f, 0f);

            for (int lado = -1; lado <= 1; lado += 2)
            {
                GameObject mureta = CriarCaixa("Mureta_Rampa", paiPonte,
                    new Vector3(lado * (larg * 0.5f - 0.1f), yCentro + 0.45f, zCentro),
                    new Vector3(0.14f, 0.7f, hip), matBorda, 1f, 1f, false, true);
                mureta.transform.localRotation = Quaternion.Euler(dir * ang, 0f, 0f);
            }
        }
    }

    private void CriarCaboEntrePontos(Transform pai, Vector3 a, Vector3 b, float espessura, Material mat)
    {
        Vector3 dir = b - a;
        float dist = dir.magnitude;
        if (dist < 0.05f) return;

        GameObject cabo = CriarCilindro("Cabo", pai, (a + b) * 0.5f, espessura * 2f, dist, mat, false, 6);
        cabo.transform.localRotation = Quaternion.FromToRotation(Vector3.up, dir.normalized);
    }

    // ============================================================
    // ZONA INDUSTRIAL / PORTO JUNTO AO RIO
    // ============================================================
    private void GerarPortoIndustrial(Transform raiz)
    {
        GameObject grupoInd = new GameObject("Porto_Industrial");
        grupoInd.transform.SetParent(raiz, false);

        Material matGalpao = MatFachada(TipoFachada.Galpao, 3, 1);
        Material matSilo = MatCor(new Color(0.74f, 0.76f, 0.78f), 0.65f);
        Material matGuindaste = MatCor(new Color(0.92f, 0.62f, 0.10f), 0.35f);
        Material matCerca = MatCor(new Color(0.35f, 0.37f, 0.40f), 0.4f);

        Color[] coresContainer =
        {
            new Color(0.76f, 0.18f, 0.16f),
            new Color(0.16f, 0.38f, 0.68f),
            new Color(0.18f, 0.54f, 0.30f),
            new Color(0.84f, 0.56f, 0.14f),
            new Color(0.56f, 0.24f, 0.48f)
        };

        for (int gx = 0; gx < quadrasX; gx++)
        {
            for (int gz = 0; gz < quadrasZ; gz++)
            {
                if (DistritoDe(gx, gz) != Distrito.Industrial) continue;
                if (QuadraEhCorredorRio(gx, gz)) continue;

                float cx = CentroQuadraX(gx);
                float cz = CentroQuadraZ(gz);
                float yBase = TopoTerreno(cx, cz) + TopoCalcada(false);

                GameObject qInd = new GameObject($"Quadra_Porto_{gx}_{gz}");
                qInd.transform.SetParent(grupoInd.transform, false);
                qInd.transform.localPosition = new Vector3(cx, yBase, cz);

                // Galpão grande
                CriarCaixa("Galpao_Porto", qInd.transform, new Vector3(-4.5f, 3.6f, -3.5f),
                    new Vector3(11.5f, 7.2f, 12.5f), matGalpao, 4f, 4f, true, true);
                CriarCaixa("Telhado_Galpao", qInd.transform, new Vector3(-4.5f, 7.4f, -3.5f),
                    new Vector3(12.2f, 0.4f, 13.0f), MatCor(new Color(0.32f, 0.34f, 0.38f), 0.2f), 2f, 2f, false, true);

                // Silos cilíndricos
                for (int s = 0; s < 2; s++)
                    CriarCilindro($"Silo_{s}", qInd.transform, new Vector3(-7.5f + s * 4.0f, 4.5f, 6.8f), 3.2f, 9.0f, matSilo, true, 12);

                // Contêineres empilhados coloridos
                int pilhas = Mathf.Clamp(Mathf.RoundToInt(densidadeIndustria), 1, 6);
                for (int c = 0; c < pilhas; c++)
                {
                    int andares = UnityEngine.Random.Range(1, 4);
                    float px = 3.5f + (c % 2) * 3.2f;
                    float pz = -6.5f + (c / 2) * 6.5f;
                    for (int a = 0; a < andares; a++)
                    {
                        Material matCont = MatCor(coresContainer[UnityEngine.Random.Range(0, coresContainer.Length)], 0.25f);
                        CriarCaixa($"Container_{c}_{a}", qInd.transform, new Vector3(px, 1.3f + a * 2.6f, pz),
                            new Vector3(2.45f, 2.55f, 5.8f), matCont, 2f, 2f, false, true);
                    }
                }

                // Guindaste portuário
                CriarGuindastePorto(qInd.transform, new Vector3(6.5f, 0f, 6.5f), matGuindaste);

                // Cercas industriais na borda
                CriarCaixa("Cerca_Norte", qInd.transform, new Vector3(0f, 0.9f, tamanhoQuadra * 0.48f), new Vector3(tamanhoQuadra * 0.9f, 1.8f, 0.14f), matCerca, 1f, 1f, false, true);

                // Caminhão estacionado de carga
                CriarCaminhaoPorto(qInd.transform, new Vector3(0.5f, 0f, 7.2f));
            }
        }

        if (combinarMalhasPorDistrito)
            CombinarGrupoEstatico(grupoInd.transform, "Industrial");
    }

    private void CriarGuindastePorto(Transform pai, Vector3 pos, Material mat)
    {
        GameObject g = new GameObject("Guindaste_Porto");
        g.transform.SetParent(pai, false);
        g.transform.localPosition = pos;

        CriarCaixa("Base", g.transform, new Vector3(0f, 0.6f, 0f), new Vector3(3.2f, 1.2f, 3.2f), mat, 1f, 1f, false, true);
        CriarCaixa("Torre", g.transform, new Vector3(0f, 9.5f, 0f), new Vector3(1.1f, 17f, 1.1f), mat, 1f, 1f, false, true);
        CriarCaixa("Lanca", g.transform, new Vector3(0f, 18.2f, 3.5f), new Vector3(0.85f, 0.9f, 15f), mat, 1f, 1f, false, false);
        CriarCaixa("Contrapeso", g.transform, new Vector3(0f, 17.6f, -3.5f), new Vector3(1.6f, 1.6f, 2.2f), MatCor(new Color(0.3f, 0.3f, 0.32f), 0.1f), 1f, 1f, false, false);
    }

    private void CriarCaminhaoPorto(Transform pai, Vector3 pos)
    {
        GameObject cam = new GameObject("Caminhao_Porto");
        cam.transform.SetParent(pai, false);
        cam.transform.localPosition = pos;

        Material matCab = MatCor(new Color(0.85f, 0.25f, 0.18f), 0.45f);
        Material matBau = MatCor(new Color(0.88f, 0.88f, 0.90f), 0.25f);
        Material matPneu = MatCor(new Color(0.08f, 0.08f, 0.09f), 0.1f);

        CriarCaixa("Cabine", cam.transform, new Vector3(0f, 1.45f, 2.6f), new Vector3(2.2f, 2.1f, 2.0f), matCab, 1f, 1f, false, true);
        CriarCaixa("Bau", cam.transform, new Vector3(0f, 1.9f, -1.6f), new Vector3(2.35f, 2.6f, 5.8f), matBau, 1f, 1f, false, true);
        float[] zRodas = { 2.5f, -0.5f, -3.5f };
        for (int i = 0; i < zRodas.Length; i++)
        {
            for (int lado = -1; lado <= 1; lado += 2)
            {
                GameObject roda = CriarCilindro("Roda", cam.transform, new Vector3(lado * 1.08f, 0.48f, zRodas[i]), 0.96f, 0.32f, matPneu, false, 10);
                roda.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
            }
        }
    }

    // ============================================================
    // BARCOS ANCORADOS E NAVEGANDO NO RIO
    // ============================================================
    private void GerarBarcos(Transform raiz)
    {
        GameObject grupoBarcos = new GameObject("Barcos_Rio");
        grupoBarcos.transform.SetParent(raiz, false);

        float yAgua = NivelAgua;
        float meiaCidade = MeiaExtensaoCidadeNoEixoRio();
        float sMin = -meiaCidade - extensaoMeandroRio * 0.7f;
        float sMax = meiaCidade + extensaoMeandroRio * 0.7f;

        // 1) Barcos ancorados próximos ao píer
        float sPier = eixoRio == EixoRio.LesteOeste_X
            ? CentroQuadraX(Mathf.Clamp(quadrasX / 2, 0, quadrasX - 1))
            : CentroQuadraZ(Mathf.Clamp(quadrasZ / 2, 0, quadrasZ - 1));
        float meiaRio = MeiaLarguraRioEm(sPier);

        for (int i = 0; i < barcosAncorados; i++)
        {
            bool pescador = i % 2 == 1;
            float sOff = sPier + (i - (barcosAncorados - 1) * 0.5f) * 6.5f;
            Vector3 pos = PontoRioMundo(sOff, -meiaRio + 3.6f, yAgua);
            GameObject barco = CriarModeloBarco($"ANIM_Barco_Ancorado_{i}", grupoBarcos.transform, pos, pescador, i);
            RegistrarObjetoDinamico(barco);
            var nav = barco.AddComponent<CidadeBarcoNavegacao>();
            nav.ConfigurarAncorado(pos, i * 17 + seedAleatoria);
        }

        // 2) Barcos navegando em rotas por waypoints
        int qtdNav = Mathf.Clamp(barcosNavegando, 0, 8);
        for (int i = 0; i < qtdNav; i++)
        {
            bool pescador = i % 3 == 0;
            float faixa = (i % 2 == 0 ? 1f : -1f) * UnityEngine.Random.Range(1.2f, Mathf.Max(1.6f, meiaRio * 0.45f));

            List<Vector3> rota = new List<Vector3>();
            int pts = 14;
            for (int w = 0; w <= pts; w++)
            {
                float t = (float)w / pts;
                float s = Mathf.Lerp(sMin, sMax, t);
                rota.Add(PontoRioMundo(s, faixa, yAgua));
            }
            if (i % 2 == 1) rota.Reverse();

            int inicio = (i * 3) % rota.Count;
            GameObject barco = CriarModeloBarco($"ANIM_Barco_Navegando_{i}", grupoBarcos.transform, rota[inicio], pescador, i + 10);
            RegistrarObjetoDinamico(barco);

            ParticleSystem esteira = CriarEsteiraBarco(barco.transform);
            var nav = barco.AddComponent<CidadeBarcoNavegacao>();
            nav.ConfigurarRota(rota, inicio, pescador ? 3.2f : 5.4f, esteira, seedAleatoria + i * 31);
        }
    }

    private GameObject CriarModeloBarco(string nome, Transform pai, Vector3 pos, bool pescador, int indiceCor)
    {
        GameObject b = new GameObject(nome);
        b.transform.SetParent(pai, false);
        b.transform.localPosition = pos;

        Color[] coresCasco =
        {
            new Color(0.94f, 0.95f, 0.96f),
            new Color(0.16f, 0.42f, 0.72f),
            new Color(0.84f, 0.24f, 0.20f),
            new Color(0.18f, 0.56f, 0.42f)
        };
        Material matCasco = MatCor(coresCasco[indiceCor % coresCasco.Length], 0.55f);
        Material matCabine = MatCor(new Color(0.95f, 0.95f, 0.95f), 0.4f);
        Material matVidro = MatCor(new Color(0.12f, 0.22f, 0.30f), 0.85f);

        float larg = pescador ? 2.2f : 1.9f;
        float comp = pescador ? 6.2f : 5.0f;

        CriarCaixa("Casco", b.transform, new Vector3(0f, 0.22f, 0f), new Vector3(larg, 0.65f, comp), matCasco, 1f, 1f, false, true);
        CriarCaixa("Proa", b.transform, new Vector3(0f, 0.28f, comp * 0.52f), new Vector3(larg * 0.6f, 0.52f, 1.1f), matCasco, 1f, 1f, false, false);
        CriarCaixa("Cabine", b.transform, new Vector3(0f, 0.85f, pescador ? 0.6f : -0.2f), new Vector3(larg * 0.76f, 0.85f, pescador ? 2.0f : 1.6f), matCabine, 1f, 1f, false, false);
        CriarCaixa("Parabrisa", b.transform, new Vector3(0f, 0.95f, pescador ? 1.62f : 0.62f), new Vector3(larg * 0.68f, 0.45f, 0.08f), matVidro, 1f, 1f, false, false);

        if (pescador)
        {
            CriarCilindro("Mastro", b.transform, new Vector3(0f, 2.0f, -1.2f), 0.12f, 2.6f, MatMadeira(), false, 6);
            CriarCaixa("Caixa_Peixe", b.transform, new Vector3(0f, 0.72f, -1.8f), new Vector3(1.1f, 0.45f, 1.1f), MatCor(new Color(0.20f, 0.55f, 0.78f), 0.2f), 1f, 1f, false, false);
        }
        return b;
    }

    private ParticleSystem CriarEsteiraBarco(Transform barcoPai)
    {
        GameObject go = new GameObject("Esteira_Espuma");
        go.transform.SetParent(barcoPai, false);
        go.transform.localPosition = new Vector3(0f, 0.05f, -2.8f);

        ParticleSystem ps = go.AddComponent<ParticleSystem>();
        var main = ps.main;
        main.loop = true;
        main.startLifetime = 1.6f;
        main.startSpeed = 0.8f;
        main.startSize = new ParticleSystem.MinMaxCurve(0.45f, 1.0f);
        main.startColor = new Color(0.92f, 0.97f, 1f, 0.45f);
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        main.maxParticles = 40;

        var em = ps.emission;
        em.rateOverTime = presetQualidade == PresetQualidade.Leve ? 8f : 16f;

        var shape = ps.shape;
        shape.shapeType = ParticleSystemShapeType.Cone;
        shape.angle = 18f;
        shape.radius = 0.35f;
        shape.rotation = new Vector3(0f, 180f, 0f);

        var psr = go.GetComponent<ParticleSystemRenderer>();
        if (psr != null)
            psr.sharedMaterial = MatEspuma();

        RegistrarParticula(ps);
        return ps;
    }
}