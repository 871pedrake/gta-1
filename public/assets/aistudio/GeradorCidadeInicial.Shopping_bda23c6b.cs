using System.Collections.Generic;
using UnityEngine;

public partial class GeradorCidadeInicial
{
    private static readonly Color[] CoresCarrosEstacionados =
    {
        new Color(0.84f, 0.18f, 0.16f),
        new Color(0.16f, 0.40f, 0.78f),
        new Color(0.90f, 0.72f, 0.12f),
        new Color(0.92f, 0.92f, 0.94f),
        new Color(0.20f, 0.22f, 0.25f),
        new Color(0.18f, 0.58f, 0.36f),
        new Color(0.86f, 0.44f, 0.14f)
    };

    partial void ExecutarEtapa2(Transform raiz)
    {
        if (criarShopping)
            GerarShopping(raiz);

        if (criarRuaComercial)
            GerarRuaComercial(raiz);

        if (criarPropsUrbanos)
            GerarPropsNasRuas(raiz);

        if (criarSemaforos)
            GerarSemaforosECruzamentos(raiz);
    }

    // ============================================================
    // 1) SHOPPING CENTER GRANDE (2 QUADRAS + PASSARELA AÉREA)
    // ============================================================
    private void GerarShopping(Transform raiz)
    {
        List<Vector2Int> quadrasShop = new List<Vector2Int>();
        for (int gx = 0; gx < quadrasX; gx++)
            for (int gz = 0; gz < quadrasZ; gz++)
                if (DistritoDe(gx, gz) == Distrito.Shopping)
                    quadrasShop.Add(new Vector2Int(gx, gz));

        if (quadrasShop.Count == 0) return;

        GameObject grupoShop = new GameObject("Shopping_Complexo");
        grupoShop.transform.SetParent(raiz, false);

        Vector2Int qMain = quadrasShop[0];
        Vector3 centroMain = new Vector3(CentroQuadraX(qMain.x), TopoTerreno(CentroQuadraX(qMain.x), CentroQuadraZ(qMain.y)) + TopoCalcada(false), CentroQuadraZ(qMain.y));
        ConstruirPredioShopping(grupoShop.transform, centroMain);

        if (quadrasShop.Count >= 2)
        {
            Vector2Int qPark = quadrasShop[1];
            Vector3 centroPark = new Vector3(CentroQuadraX(qPark.x), TopoTerreno(CentroQuadraX(qPark.x), CentroQuadraZ(qPark.y)) + TopoCalcada(false), CentroQuadraZ(qPark.y));
            ConstruirEstacionamentoShopping(grupoShop.transform, centroPark);

            // Passarela aérea envidraçada ligando os 2 blocos sobre a rua (altura livre 5.5m)
            Vector3 meio = (centroMain + centroPark) * 0.5f;
            float vao = Vector3.Distance(centroMain, centroPark) - tamanhoQuadra * 0.6f;
            Material matVidroShop = MatCor(new Color(0.24f, 0.62f, 0.80f, 0.65f), 0.75f, false, true);
            Material matAcm = MatCor(new Color(0.16f, 0.24f, 0.44f), 0.45f);
            GameObject pass = new GameObject("Passarela_Shopping");
            pass.transform.SetParent(grupoShop.transform, false);
            pass.transform.localPosition = new Vector3(meio.x, meio.y + 6.2f, meio.z);
            CriarCaixa("Piso_Pass", pass.transform, Vector3.zero, new Vector3(vao, 0.3f, 4.2f), matAcm, 2f, 2f, false, true);
            CriarCaixa("Vidro_Pass", pass.transform, new Vector3(0f, 1.4f, 0f), new Vector3(vao, 2.5f, 4.0f), matVidroShop, 2f, 2f, false, false);
            CriarCaixa("Teto_Pass", pass.transform, new Vector3(0f, 2.75f, 0f), new Vector3(vao + 0.4f, 0.25f, 4.5f), matAcm, 2f, 2f, false, false);
        }

        if (combinarMalhasPorDistrito)
            CombinarGrupoEstatico(grupoShop.transform, "Shopping");
    }

    private void ConstruirPredioShopping(Transform pai, Vector3 posBase)
    {
        GameObject s = new GameObject("Edificio_Shopping");
        s.transform.SetParent(pai, false);
        s.transform.localPosition = posBase;

        float l = tamanhoQuadra - 2.6f;
        float p = tamanhoQuadra - 3.6f;

        Material matAcmAzul = MatCor(new Color(0.14f, 0.34f, 0.62f), 0.45f);
        Material matAcmLaranja = MatCor(new Color(0.92f, 0.44f, 0.14f), 0.40f);
        Material matVidro = MatCor(new Color(0.32f, 0.68f, 0.86f, 0.68f), 0.8f, false, true);
        Material matVitrine = MatCor(new Color(0.95f, 0.90f, 0.72f), 0.3f, true);
        Material matNeon = MatCor(new Color(1.0f, 0.22f, 0.62f), 0.2f, true);

        // Corpo principal ACM + Vidro
        CriarCaixa("Corpo_Shopping", s.transform, new Vector3(0f, 5.5f, 0.8f), new Vector3(l, 11f, p), matAcmAzul, 4f, 4f, false, true);
        CriarCaixa("Faixa_ACM_Laranja", s.transform, new Vector3(0f, 9.8f, -p * 0.5f + 0.68f), new Vector3(l + 0.3f, 2.2f, 0.3f), matAcmLaranja, 2f, 2f, false, false);

        // Vitrines emissivas no térreo
        CriarCaixa("Vitrines_Terreo", s.transform, new Vector3(0f, 1.85f, -p * 0.5f + 0.72f), new Vector3(l * 0.82f, 3.2f, 0.24f), matVitrine, 2f, 2f, false, false);
        CriarCaixa("Entrada_Vidro", s.transform, new Vector3(0f, 2.4f, -p * 0.5f + 0.5f), new Vector3(6.2f, 4.4f, 0.4f), matVidro, 1f, 1f, false, false);

        // Marquise de entrada + Letreiro gigante emissivo
        CriarCaixa("Marquise_Shopping", s.transform, new Vector3(0f, 4.7f, -p * 0.5f - 0.8f), new Vector3(11.5f, 0.45f, 3.2f), matAcmLaranja, 1f, 1f, false, true);
        CriarCaixa("Letreiro_Painel", s.transform, new Vector3(0f, 11.4f, -p * 0.5f + 0.3f), new Vector3(13.5f, 2.6f, 0.45f), MatCor(new Color(0.10f, 0.12f, 0.18f), 0.2f), 1f, 1f, false, false);
        CriarCaixa("Letreiro_Neon_Borda", s.transform, new Vector3(0f, 11.4f, -p * 0.5f + 0.05f), new Vector3(12.8f, 2.0f, 0.12f), matNeon, 1f, 1f, false, false);

        // Canteiros com palmeiras, ponto de ônibus e ponto de táxi na frente
        float zFrente = -tamanhoQuadra * 0.5f + 1.4f;
        CriarPalmeira(s.transform, new Vector3(-l * 0.38f, 0f, zFrente + 0.5f));
        CriarPalmeira(s.transform, new Vector3(l * 0.38f, 0f, zFrente + 0.5f));
        CriarAbrigoOnibus(s.transform, new Vector3(-6.2f, 0f, zFrente), 0f);
        CriarPlacaTaxi(s.transform, new Vector3(6.8f, 0f, zFrente));
    }

    private void ConstruirEstacionamentoShopping(Transform pai, Vector3 posBase)
    {
        GameObject pk = new GameObject("Estacionamento_Shopping");
        pk.transform.SetParent(pai, false);
        pk.transform.localPosition = posBase;

        float area = tamanhoQuadra - 2.2f;
        CriarCaixa("Piso_Estacionamento", pk.transform, new Vector3(0f, 0.03f, 0f), new Vector3(area, 0.06f, area),
            MatAsfalto(), metrosPorTexturaAsfalto, metrosPorTexturaAsfalto, false, true);

        Material matFaixa = MatCor(new Color(0.95f, 0.95f, 0.95f), 0.1f);
        Material matCancela = MatCor(new Color(0.90f, 0.20f, 0.16f), 0.3f);

        // Vagas pintadas e carros parados em cores variadas
        for (int row = -1; row <= 1; row += 2)
        {
            float zVaga = row * 5.2f;
            for (int v = -3; v <= 3; v++)
            {
                float xVaga = v * 2.75f;
                CriarCaixa("Linha_Vaga", pk.transform, new Vector3(xVaga - 1.35f, 0.07f, zVaga),
                    new Vector3(0.12f, 0.02f, 4.4f), matFaixa, 1f, 1f, false, false);

                if (v < 3 && UnityEngine.Random.value < 0.65f)
                    CriarCarroEstacionado(pk.transform, new Vector3(xVaga, 0.06f, zVaga), row > 0 ? 180f : 0f);
            }
        }

        // Baia de carrinhos de compras + cancela + postes altos
        CriarCaixa("Abrigo_Carrinhos", pk.transform, new Vector3(-area * 0.35f, 0.9f, 0f), new Vector3(3.0f, 1.8f, 1.8f),
            MatCor(new Color(0.22f, 0.56f, 0.85f, 0.55f), 0.6f, false, true), 1f, 1f, false, true);
        for (int c = 0; c < 3; c++)
            CriarCaixa($"Carrinho_{c}", pk.transform, new Vector3(-area * 0.35f - 0.6f + c * 0.6f, 0.45f, 0f),
                new Vector3(0.45f, 0.8f, 0.75f), MatCor(new Color(0.75f, 0.78f, 0.82f), 0.7f), 1f, 1f, false, false);

        CriarCaixa("Cabine_Cancela", pk.transform, new Vector3(0f, 1.1f, -area * 0.46f), new Vector3(1.4f, 2.2f, 1.4f),
            MatCor(new Color(0.88f, 0.88f, 0.90f), 0.2f), 1f, 1f, false, true);
        CriarCaixa("Barra_Cancela", pk.transform, new Vector3(2.2f, 1.0f, -area * 0.46f), new Vector3(3.4f, 0.12f, 0.12f),
            matCancela, 1f, 1f, false, false);

        // Postes altos duplos de estacionamento + canteiros
        CriarPosteAlto(pk.transform, new Vector3(-5f, 0f, 0f));
        CriarPosteAlto(pk.transform, new Vector3(5f, 0f, 0f));
        CriarPalmeira(pk.transform, new Vector3(area * 0.42f, 0f, area * 0.42f));
        CriarPalmeira(pk.transform, new Vector3(-area * 0.42f, 0f, -area * 0.42f));
    }

    private void CriarPosteAlto(Transform pai, Vector3 pos)
    {
        Material matPoste = MatCor(new Color(0.24f, 0.26f, 0.30f), 0.4f);
        CriarCilindro("Poste_Alto", pai, pos + Vector3.up * 4.5f, 0.22f, 9.0f, matPoste, true, 8);
        CriarCaixa("Braco_Duplo", pai, pos + Vector3.up * 8.9f, new Vector3(2.6f, 0.14f, 0.18f), matPoste, 1f, 1f, false, false);
        CriarCaixa("Lum_E", pai, pos + new Vector3(-1.1f, 8.75f, 0f), new Vector3(0.5f, 0.15f, 0.35f), MatLampada(), 1f, 1f, false, false);
        CriarCaixa("Lum_D", pai, pos + new Vector3(1.1f, 8.75f, 0f), new Vector3(0.5f, 0.15f, 0.35f), MatLampada(), 1f, 1f, false, false);
    }

    // ============================================================
    // 2) RUA COMERCIAL (LOJAS COLADAS, TOLDOS, LETREIROS, NEON)
    // ============================================================
    private void GerarRuaComercial(Transform raiz)
    {
        GameObject grupoCom = new GameObject("Rua_Comercial_Fachadas");
        grupoCom.transform.SetParent(raiz, false);

        int zAlvo = Mathf.Clamp(quadrasZ / 2, 0, quadrasZ - 1);
        if (criarRio && QuadraEhCorredorRio(0, zAlvo))
            zAlvo = zAlvo > 0 ? zAlvo - 1 : Mathf.Min(quadrasZ - 1, zAlvo + 1);

        Color[] coresToldo = { new Color(0.86f, 0.18f, 0.18f), new Color(0.14f, 0.56f, 0.36f), new Color(0.16f, 0.40f, 0.80f), new Color(0.92f, 0.58f, 0.10f) };
        Color[] coresNeon = { new Color(1.0f, 0.18f, 0.65f), new Color(0.12f, 0.92f, 1.0f), new Color(1.0f, 0.80f, 0.15f), new Color(0.30f, 1.0f, 0.45f) };

        for (int gx = 0; gx < quadrasX; gx++)
        {
            Distrito d = DistritoDe(gx, zAlvo);
            if (d == Distrito.Shopping || d == Distrito.Industrial || (gx == quadrasX / 2 && zAlvo == quadrasZ / 2)) continue;
            if (QuadraEhCorredorRio(gx, zAlvo)) continue;

            float cx = CentroQuadraX(gx);
            float cz = CentroQuadraZ(zAlvo);
            float yBase = TopoTerreno(cx, cz) + TopoCalcada(false);

            for (int lado = -1; lado <= 1; lado += 2)
            {
                float zLoja = cz + lado * (tamanhoQuadra * 0.5f - 1.0f);
                for (int i = -1; i <= 1; i++)
                {
                    float xLoja = cx + i * 6.2f;
                    int idx = Mathf.Abs(gx * 7 + i + lado) % 4;
                    Color cToldo = coresToldo[idx];
                    Color cNeon = coresNeon[(idx + 1) % 4];

                    GameObject loja = new GameObject($"Fachada_Comercial_{gx}_{lado}_{i}");
                    loja.transform.SetParent(grupoCom.transform, false);
                    loja.transform.localPosition = new Vector3(xLoja, yBase, zLoja);
                    loja.transform.localRotation = Quaternion.Euler(0f, lado > 0 ? 0f : 180f, 0f);

                    // Toldo colorido inclinado
                    GameObject toldo = CriarCaixa("Toldo", loja.transform, new Vector3(0f, 2.75f, 0.85f),
                        new Vector3(4.8f, 0.14f, 1.6f), MatCor(cToldo, 0.15f), 1f, 1f, false, false);
                    toldo.transform.localRotation = Quaternion.Euler(18f, 0f, 0f);

                    // Letreiro procedural emissivo + faixa neon
                    Material matLet = texLetreiros != null
                        ? ObterMaterial($"letreiro_{idx}", Color.white, texLetreiros[idx], Vector2.one, 0.2f, true, false)
                        : MatCor(cNeon, 0.2f, true);
                    CriarCaixa("Letreiro", loja.transform, new Vector3(0f, 3.65f, 0.25f), new Vector3(4.4f, 0.95f, 0.24f), matLet, 4f, 1f, false, false);
                    CriarCaixa("Neon_Borda", loja.transform, new Vector3(0f, 4.22f, 0.30f), new Vector3(4.6f, 0.10f, 0.14f), MatCor(cNeon, 0.2f, true), 1f, 1f, false, false);
                }
            }
        }

        if (combinarMalhasPorDistrito)
            CombinarGrupoEstatico(grupoCom.transform, "RuaComercial");
    }

    // ============================================================
    // 3) OBRA COM GRUA E TAPUMES (1 QUADRA)
    // ============================================================
    private void GerarQuadraObra(Transform quadraPai, float tamanho)
    {
        float topo = TopoCalcada(false);
        float half = tamanho * 0.5f - 0.5f;
        Material matTapume = MatCor(new Color(0.16f, 0.36f, 0.62f), 0.1f);
        Material matConcreto = MatCor(new Color(0.56f, 0.56f, 0.58f), 0.08f);
        Material matGrua = MatCor(new Color(0.95f, 0.66f, 0.08f), 0.35f);

        // Tapumes perimetrais com abertura de entrada
        CriarCaixa("Tapume_N", quadraPai, new Vector3(0f, topo + 1.0f, half), new Vector3(tamanho - 2f, 2.0f, 0.16f), matTapume, 2f, 2f, false, true);
        CriarCaixa("Tapume_S", quadraPai, new Vector3(-3.5f, topo + 1.0f, -half), new Vector3(tamanho * 0.55f, 2.0f, 0.16f), matTapume, 2f, 2f, false, true);
        CriarCaixa("Tapume_L", quadraPai, new Vector3(half, topo + 1.0f, 0f), new Vector3(0.16f, 2.0f, tamanho - 2f), matTapume, 2f, 2f, false, true);
        CriarCaixa("Tapume_O", quadraPai, new Vector3(-half, topo + 1.0f, 0f), new Vector3(0.16f, 2.0f, tamanho - 2f), matTapume, 2f, 2f, false, true);

        // Prédio em construção (pilares e lajes abertas)
        for (int a = 0; a < 4; a++)
        {
            float yLaje = topo + (a + 1) * 3.2f;
            CriarCaixa($"Laje_Obra_{a}", quadraPai, new Vector3(-1.5f, yLaje, 0f), new Vector3(11f, 0.28f, 11f), matConcreto, 2f, 2f, false, true);
            for (int px = -1; px <= 1; px += 2)
                for (int pz = -1; pz <= 1; pz += 2)
                    CriarCaixa("Pilar_Obra", quadraPai, new Vector3(-1.5f + px * 4.8f, yLaje - 1.6f, pz * 4.8f),
                        new Vector3(0.45f, 3.2f, 0.45f), matConcreto, 1f, 1f, false, true);
        }

        // Grua alta de construção
        CriarCaixa("Grua_Base", quadraPai, new Vector3(6.2f, topo + 0.5f, 5.0f), new Vector3(2.8f, 1.0f, 2.8f), matConcreto, 1f, 1f, false, true);
        CriarCaixa("Grua_Torre", quadraPai, new Vector3(6.2f, topo + 12f, 5.0f), new Vector3(1.1f, 22f, 1.1f), matGrua, 1f, 1f, false, true);
        CriarCaixa("Grua_Lanca", quadraPai, new Vector3(1.2f, topo + 22.8f, 5.0f), new Vector3(18f, 0.9f, 0.9f), matGrua, 1f, 1f, false, false);
        CriarCaixa("Grua_Contrapeso", quadraPai, new Vector3(10.5f, topo + 22.2f, 5.0f), new Vector3(2.2f, 1.6f, 1.6f), matConcreto, 1f, 1f, false, false);

        // Cones na entrada da obra
        for (int c = 0; c < 3; c++)
            CriarCone(quadraPai, new Vector3(3.5f + c * 1.4f, topo, -half - 0.3f));
    }

    // ============================================================
    // 4) PROPS URBANOS (BANCAS, FOOD TRUCKS, FEIRAS, MOTOS, HIDRANTES...)
    // ============================================================
    private void GerarPropsNasRuas(Transform raiz)
    {
        GameObject grupoProps = new GameObject("Props_Urbanos");
        grupoProps.transform.SetParent(raiz, false);

        float chance = Mathf.Clamp01(0.45f * densidadeProps * (presetQualidade == PresetQualidade.Leve ? 0.55f : 1f));

        for (int gx = 0; gx < quadrasX; gx++)
        {
            for (int gz = 0; gz < quadrasZ; gz++)
            {
                if (QuadraEhCorredorRio(gx, gz)) continue;
                Distrito d = DistritoDe(gx, gz);
                if (d == Distrito.Shopping) continue;

                float cx = CentroQuadraX(gx);
                float cz = CentroQuadraZ(gz);
                float y = TopoTerreno(cx, cz) + TopoCalcada(gx == quadrasX / 2 && gz == quadrasZ / 2);
                float borda = tamanhoQuadra * 0.5f - 0.55f;

                // Coloca props nas 4 bordas da calçada
                Vector3[] slots =
                {
                    new Vector3(cx + UnityEngine.Random.Range(-6f, 6f), y, cz + borda),
                    new Vector3(cx + UnityEngine.Random.Range(-6f, 6f), y, cz - borda),
                    new Vector3(cx + borda, y, cz + UnityEngine.Random.Range(-6f, 6f)),
                    new Vector3(cx - borda, y, cz + UnityEngine.Random.Range(-6f, 6f))
                };

                for (int s = 0; s < slots.Length; s++)
                {
                    if (UnityEngine.Random.value > chance) continue;
                    float rotY = s == 0 ? 0f : (s == 1 ? 180f : (s == 2 ? 90f : -90f));
                    float tipo = UnityEngine.Random.value;

                    if (tipo < 0.14f) CriarBancaJornal(grupoProps.transform, slots[s], rotY);
                    else if (tipo < 0.24f) CriarFoodTruck(grupoProps.transform, slots[s], rotY);
                    else if (tipo < 0.34f && d == Distrito.Residencial) CriarBarracaFeira(grupoProps.transform, slots[s], rotY);
                    else if (tipo < 0.50f) CriarLixeira(grupoProps.transform, slots[s]);
                    else if (tipo < 0.62f) CriarHidrante(grupoProps.transform, slots[s]);
                    else if (tipo < 0.72f) CriarOrelhao(grupoProps.transform, slots[s]);
                    else if (tipo < 0.84f) CriarMotoEstacionada(grupoProps.transform, slots[s], rotY);
                    else if (tipo < 0.92f) CriarAbrigoOnibus(grupoProps.transform, slots[s], rotY);
                    else CriarSacoLixo(grupoProps.transform, slots[s]);
                }

                // Bueiros junto ao meio-fio
                if (UnityEngine.Random.value < 0.5f)
                    CriarCaixa("Bueiro", grupoProps.transform, new Vector3(cx, TopoAsfalto + 0.01f, cz + tamanhoQuadra * 0.5f + 0.9f),
                        new Vector3(0.95f, 0.02f, 0.65f), MatCor(new Color(0.18f, 0.19f, 0.21f), 0.5f), 1f, 1f, false, false);
            }
        }

        if (combinarMalhasPorDistrito)
            CombinarGrupoEstatico(grupoProps.transform, "Props");
    }

    private void CriarBancaJornal(Transform pai, Vector3 pos, float rotY)
    {
        GameObject b = new GameObject("Banca_Jornal");
        b.transform.SetParent(pai, false);
        b.transform.localPosition = pos;
        b.transform.localRotation = Quaternion.Euler(0f, rotY, 0f);
        CriarCaixa("Corpo", b.transform, new Vector3(0f, 1.05f, 0f), new Vector3(2.2f, 2.1f, 1.3f), MatCor(new Color(0.18f, 0.44f, 0.34f), 0.2f), 1f, 1f, false, true);
        CriarCaixa("Teto", b.transform, new Vector3(0f, 2.25f, 0.15f), new Vector3(2.5f, 0.22f, 1.8f), MatCor(new Color(0.88f, 0.28f, 0.18f), 0.2f), 1f, 1f, false, false);
        CriarCaixa("Revisteiro", b.transform, new Vector3(0f, 0.9f, 0.70f), new Vector3(1.8f, 0.7f, 0.16f), MatCor(new Color(0.95f, 0.80f, 0.25f), 0.1f), 1f, 1f, false, false);
    }

    private void CriarFoodTruck(Transform pai, Vector3 pos, float rotY)
    {
        GameObject ft = new GameObject("Food_Truck");
        ft.transform.SetParent(pai, false);
        ft.transform.localPosition = pos;
        ft.transform.localRotation = Quaternion.Euler(0f, rotY + 90f, 0f);
        CriarCaixa("Van", ft.transform, new Vector3(0f, 1.25f, 0f), new Vector3(1.9f, 2.0f, 3.8f), MatCor(new Color(0.96f, 0.56f, 0.16f), 0.4f), 1f, 1f, false, true);
        CriarCaixa("Janela_Atend", ft.transform, new Vector3(0.98f, 1.45f, -0.2f), new Vector3(0.08f, 0.9f, 1.8f), MatCor(new Color(0.96f, 0.92f, 0.68f), 0.2f, true), 1f, 1f, false, false);
        CriarCaixa("Toldo_FT", ft.transform, new Vector3(1.3f, 2.05f, -0.2f), new Vector3(0.9f, 0.08f, 2.0f), MatCor(new Color(0.85f, 0.18f, 0.18f), 0.2f), 1f, 1f, false, false);
    }

    private void CriarBarracaFeira(Transform pai, Vector3 pos, float rotY)
    {
        GameObject bf = new GameObject("Barraca_Feira");
        bf.transform.SetParent(pai, false);
        bf.transform.localPosition = pos;
        bf.transform.localRotation = Quaternion.Euler(0f, rotY, 0f);
        CriarCaixa("Mesa", bf.transform, new Vector3(0f, 0.45f, 0f), new Vector3(2.2f, 0.9f, 1.1f), MatMadeira(), 1f, 1f, false, true);
        CriarCaixa("Lona", bf.transform, new Vector3(0f, 2.15f, 0f), new Vector3(2.4f, 0.16f, 1.5f), MatCor(new Color(0.16f, 0.60f, 0.88f), 0.1f), 1f, 1f, false, false);
    }

    private void CriarLixeira(Transform pai, Vector3 pos) =>
        CriarCilindro("Lixeira", pai, pos + Vector3.up * 0.42f, 0.46f, 0.84f, MatCor(new Color(0.20f, 0.50f, 0.28f), 0.3f), true, 8);

    private void CriarHidrante(Transform pai, Vector3 pos)
    {
        CriarCilindro("Hidrante_Corpo", pai, pos + Vector3.up * 0.36f, 0.30f, 0.72f, MatCor(new Color(0.84f, 0.12f, 0.12f), 0.4f), true, 8);
        CriarCaixa("Hidrante_Bicos", pai, pos + Vector3.up * 0.50f, new Vector3(0.46f, 0.14f, 0.14f), MatCor(new Color(0.84f, 0.12f, 0.12f), 0.4f), 1f, 1f, false, false);
    }

    private void CriarOrelhao(Transform pai, Vector3 pos)
    {
        CriarCilindro("Orelhao_Poste", pai, pos + Vector3.up * 0.9f, 0.12f, 1.8f, MatCor(new Color(0.32f, 0.34f, 0.38f), 0.3f), true, 6);
        CriarEsfera("Orelhao_Concha", pai, pos + Vector3.up * 1.78f, 0.85f, MatCor(new Color(0.12f, 0.42f, 0.86f), 0.45f), false);
    }

    private void CriarCone(Transform pai, Vector3 pos) =>
        CriarCilindro("Cone", pai, pos + Vector3.up * 0.32f, 0.32f, 0.64f, MatCor(new Color(0.96f, 0.42f, 0.06f), 0.2f), false, 6);

    private void CriarSacoLixo(Transform pai, Vector3 pos) =>
        CriarEsfera("Saco_Lixo", pai, pos + Vector3.up * 0.22f, 0.52f, MatCor(new Color(0.08f, 0.09f, 0.10f), 0.35f), false);

    private void CriarAbrigoOnibus(Transform pai, Vector3 pos, float rotY)
    {
        GameObject ab = new GameObject("Abrigo_Onibus");
        ab.transform.SetParent(pai, false);
        ab.transform.localPosition = pos;
        ab.transform.localRotation = Quaternion.Euler(0f, rotY, 0f);
        Material matMetal = MatCor(new Color(0.24f, 0.28f, 0.34f), 0.5f);
        CriarCaixa("Fundo_Vidro", ab.transform, new Vector3(0f, 1.15f, -0.45f), new Vector3(3.2f, 2.2f, 0.08f), MatCor(new Color(0.45f, 0.72f, 0.84f, 0.48f), 0.7f, false, true), 1f, 1f, false, true);
        CriarCaixa("Teto_Abrigo", ab.transform, new Vector3(0f, 2.35f, 0.05f), new Vector3(3.5f, 0.14f, 1.3f), matMetal, 1f, 1f, false, true);
        CriarCaixa("Banco_Abrigo", ab.transform, new Vector3(0f, 0.48f, -0.15f), new Vector3(2.4f, 0.10f, 0.42f), MatMadeira(), 1f, 1f, false, false);
    }

    private void CriarPlacaTaxi(Transform pai, Vector3 pos)
    {
        CriarCilindro("Poste_Taxi", pai, pos + Vector3.up * 1.1f, 0.10f, 2.2f, MatCor(new Color(0.3f, 0.3f, 0.32f), 0.4f), true, 6);
        CriarCaixa("Placa_Taxi", pai, pos + Vector3.up * 2.15f, new Vector3(0.65f, 0.42f, 0.08f), MatCor(new Color(0.98f, 0.80f, 0.08f), 0.2f, true), 1f, 1f, false, false);
    }

    private void CriarCarroEstacionado(Transform pai, Vector3 pos, float rotY)
    {
        GameObject car = new GameObject("Carro_Estacionado");
        car.transform.SetParent(pai, false);
        car.transform.localPosition = pos;
        car.transform.localRotation = Quaternion.Euler(0f, rotY, 0f);

        Color cor = CoresCarrosEstacionados[UnityEngine.Random.Range(0, CoresCarrosEstacionados.Length)];
        Material matLat = MatCor(cor, 0.65f);
        Material matVidro = MatCor(new Color(0.12f, 0.18f, 0.24f), 0.85f);
        Material matPneu = MatCor(new Color(0.08f, 0.08f, 0.09f), 0.1f);

        CriarCaixa("Chassi", car.transform, new Vector3(0f, 0.55f, 0f), new Vector3(1.80f, 0.68f, 4.10f), matLat, 1f, 1f, false, true);
        CriarCaixa("Cabine", car.transform, new Vector3(0f, 1.12f, -0.18f), new Vector3(1.52f, 0.56f, 2.10f), matVidro, 1f, 1f, false, false);
        for (int x = -1; x <= 1; x += 2)
        {
            for (int z = -1; z <= 1; z += 2)
            {
                GameObject r = CriarCilindro("Roda", car.transform, new Vector3(x * 0.88f, 0.32f, z * 1.32f), 0.64f, 0.24f, matPneu, false, 10);
                r.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
            }
        }
    }

    private void CriarMotoEstacionada(Transform pai, Vector3 pos, float rotY)
    {
        GameObject m = new GameObject("Moto_Estacionada");
        m.transform.SetParent(pai, false);
        m.transform.localPosition = pos;
        m.transform.localRotation = Quaternion.Euler(0f, rotY + 35f, 0f);

        Material mat = MatCor(CoresCarrosEstacionados[UnityEngine.Random.Range(0, CoresCarrosEstacionados.Length)], 0.6f);
        Material matPneu = MatCor(new Color(0.08f, 0.08f, 0.09f), 0.1f);
        CriarCaixa("Tanque", m.transform, new Vector3(0f, 0.65f, 0f), new Vector3(0.45f, 0.50f, 1.45f), mat, 1f, 1f, false, true);
        GameObject r1 = CriarCilindro("Roda_F", m.transform, new Vector3(0f, 0.28f, 0.65f), 0.56f, 0.14f, matPneu, false, 8);
        r1.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
        GameObject r2 = CriarCilindro("Roda_T", m.transform, new Vector3(0f, 0.28f, -0.65f), 0.56f, 0.14f, matPneu, false, 8);
        r2.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
    }

    // ============================================================
    // 5) SEMÁFOROS REAIS SINCRONIZADOS + FAIXAS DE PEDESTRE
    // ============================================================
    private void GerarSemaforosECruzamentos(Transform raiz)
    {
        GameObject grupoSem = new GameObject("Semaforos_Cruzamentos");
        grupoSem.transform.SetParent(raiz, false);

        Material matBranco = MatCor(new Color(0.94f, 0.94f, 0.94f), 0.1f);
        Material matPoste = MatCor(new Color(0.18f, 0.20f, 0.22f), 0.45f);
        Material matCaixa = MatCor(new Color(0.10f, 0.10f, 0.12f), 0.3f);
        Material matLenteBase = ObterMaterial("semaforo_lente_base", Color.white, null, Vector2.one, 0.4f, true, false);

        float yAsf = TopoAsfalto + 0.015f;
        float meiaRua = larguraRua * 0.5f;

        for (int kx = 0; kx <= quadrasX; kx++)
        {
            float xCruz = CentroRuaX(kx);
            for (int kz = 0; kz <= quadrasZ; kz++)
            {
                float zCruz = CentroRuaZ(kz);
                if (criarRio && RetanguloSobreRio(xCruz, zCruz, larguraRua, larguraRua)) continue;

                // Faixas de pedestre nos 4 lados do cruzamento
                for (int i = -3; i <= 3; i++)
                {
                    float off = i * 1.15f;
                    CriarCaixa("Zebra_N", grupoSem.transform, new Vector3(xCruz + off, yAsf, zCruz + meiaRua + 1.3f), new Vector3(0.55f, 0.02f, 2.2f), matBranco, 1f, 1f, false, false);
                    CriarCaixa("Zebra_S", grupoSem.transform, new Vector3(xCruz + off, yAsf, zCruz - meiaRua - 1.3f), new Vector3(0.55f, 0.02f, 2.2f), matBranco, 1f, 1f, false, false);
                    CriarCaixa("Zebra_L", grupoSem.transform, new Vector3(xCruz + meiaRua + 1.3f, yAsf, zCruz + off), new Vector3(2.2f, 0.02f, 0.55f), matBranco, 1f, 1f, false, false);
                    CriarCaixa("Zebra_O", grupoSem.transform, new Vector3(xCruz - meiaRua - 1.3f, yAsf, zCruz + off), new Vector3(2.2f, 0.02f, 0.55f), matBranco, 1f, 1f, false, false);
                }

                // Semáforos nos cruzamentos internos
                if (kx == 0 || kx == quadrasX || kz == 0 || kz == quadrasZ) continue;
                if (presetQualidade == PresetQualidade.Leve && (kx + kz) % 2 != 0) continue;

                GameObject cruz = new GameObject($"Cruzamento_Semaforo_{kx}_{kz}");
                cruz.transform.SetParent(grupoSem.transform, false);
                cruz.transform.localPosition = new Vector3(xCruz, TopoAsfalto, zCruz);

                var ctrl = cruz.AddComponent<CidadeSemaforoControlador>();
                List<MeshRenderer> vX = new List<MeshRenderer>(), aX = new List<MeshRenderer>(), rX = new List<MeshRenderer>();
                List<MeshRenderer> vZ = new List<MeshRenderer>(), aZ = new List<MeshRenderer>(), rZ = new List<MeshRenderer>();

                // 2 postes em diagonal cobrindo os 2 eixos
                CriarPosteSemaforo(cruz.transform, new Vector3(-meiaRua - 0.5f, 0f, -meiaRua - 0.5f), 0f, matPoste, matCaixa, matLenteBase, rX, aX, vX);
                CriarPosteSemaforo(cruz.transform, new Vector3(meiaRua + 0.5f, 0f, meiaRua + 0.5f), 90f, matPoste, matCaixa, matLenteBase, rZ, aZ, vZ);

                ctrl.Configurar(duracaoVerdeSemaforo, (kx * 3 + kz) * 2.5f, rX, aX, vX, rZ, aZ, vZ);
            }
        }

        if (combinarMalhasPorDistrito)
            CombinarGrupoEstatico(grupoSem.transform, "Semaforos");
    }

    private void CriarPosteSemaforo(Transform pai, Vector3 pos, float rotY, Material matPoste, Material matCaixa, Material matLente,
        List<MeshRenderer> listaVerm, List<MeshRenderer> listaAmar, List<MeshRenderer> listaVerd)
    {
        GameObject p = new GameObject("Poste_Semaforo");
        p.transform.SetParent(pai, false);
        p.transform.localPosition = pos;
        p.transform.localRotation = Quaternion.Euler(0f, rotY, 0f);

        CriarCilindro("Haste", p.transform, new Vector3(0f, 2.75f, 0f), 0.20f, 5.5f, matPoste, true, 8);
        CriarCaixa("Braco", p.transform, new Vector3(1.5f, 5.3f, 0f), new Vector3(3.2f, 0.16f, 0.16f), matPoste, 1f, 1f, false, false);
        CriarCaixa("Caixa_Luzes", p.transform, new Vector3(2.8f, 4.95f, 0f), new Vector3(0.42f, 1.15f, 0.36f), matCaixa, 1f, 1f, false, false);

        listaVerm.Add(CriarLenteSemaforo(p.transform, new Vector3(2.8f, 5.28f, 0f), matLente));
        listaAmar.Add(CriarLenteSemaforo(p.transform, new Vector3(2.8f, 4.95f, 0f), matLente));
        listaVerd.Add(CriarLenteSemaforo(p.transform, new Vector3(2.8f, 4.62f, 0f), matLente));
    }

    private MeshRenderer CriarLenteSemaforo(Transform pai, Vector3 pos, Material matLente)
    {
        GameObject l = CriarCaixa("ANIM_Lente_Sem", pai, pos, new Vector3(0.24f, 0.24f, 0.42f), matLente, 1f, 1f, false, false);
        RegistrarObjetoDinamico(l); // Não combinar para poder acender/apagar individualmente
        return l.GetComponent<MeshRenderer>();
    }
}