using UnityEngine;

public partial class GeradorCidadeInicial
{
    [System.NonSerialized] internal Vector2Int quadraObra = new Vector2Int(-1, -1);

    private void AssignDistricts()
    {
        gradeDistrito = new Distrito[quadrasX, quadrasZ];
        quadraObra = new Vector2Int(-1, -1);

        int centroX = quadrasX / 2;
        int centroZ = quadrasZ / 2;

        for (int gx = 0; gx < quadrasX; gx++)
        {
            for (int gz = 0; gz < quadrasZ; gz++)
            {
                if (criarRio && QuadraEhCorredorRio(gx, gz))
                {
                    gradeDistrito[gx, gz] = Distrito.Orla;
                    continue;
                }

                int distCentro = Mathf.Max(Mathf.Abs(gx - centroX), Mathf.Abs(gz - centroZ));
                bool ehBorda = gx == 0 || gx == quadrasX - 1 || gz == 0 || gz == quadrasZ - 1;

                Distrito d;
                if (distCentro <= 1)
                    d = Distrito.Centro;
                else if (distCentro == 2)
                    d = Distrito.Comercial;
                else if (ehBorda && gx == quadrasX - 1 && gz >= 1 && gz <= quadrasZ - 2)
                    d = Distrito.Morro;
                else if (ehBorda)
                    d = Distrito.Orla;
                else
                    d = Distrito.Residencial;

                if (criarPortoIndustrial && AdjacenteAoRio(gx, gz) && gx <= Mathf.Max(1, quadrasX / 3) && !(gx == centroX && gz == centroZ))
                    d = Distrito.Industrial;

                gradeDistrito[gx, gz] = d;
            }
        }

        // Reserva 2 quadras vizinhas para o Shopping (fora da praça e do rio)
        if (criarShopping && quadrasX >= 4 && quadrasZ >= 3)
        {
            int sx0 = Mathf.Min(quadrasX - 2, centroX + 1);
            int sz0 = centroZ;
            if (QuadraEhCorredorRio(sx0, sz0) || QuadraEhCorredorRio(sx0 + 1, sz0))
                sz0 = centroZ > 0 ? centroZ - 1 : Mathf.Min(quadrasZ - 1, centroZ + 1);

            if (!QuadraEhCorredorRio(sx0, sz0) && !QuadraEhCorredorRio(sx0 + 1, sz0) && !(sx0 == centroX && sz0 == centroZ))
            {
                gradeDistrito[sx0, sz0] = Distrito.Shopping;
                gradeDistrito[sx0 + 1, sz0] = Distrito.Shopping;
            }
        }

        // Seleciona 1 quadra para a obra com grua
        if (criarObraComGrua)
        {
            for (int gx = 0; gx < quadrasX; gx++)
            {
                for (int gz = 0; gz < quadrasZ; gz++)
                {
                    if (gx == centroX && gz == centroZ) continue;
                    if (QuadraEhCorredorRio(gx, gz)) continue;
                    if (gradeDistrito[gx, gz] == Distrito.Comercial || gradeDistrito[gx, gz] == Distrito.Residencial)
                    {
                        if (gx == Mathf.Max(0, centroX - 2) && gz == Mathf.Max(0, centroZ - 1))
                        {
                            quadraObra = new Vector2Int(gx, gz);
                            return;
                        }
                    }
                }
            }
        }
    }

    internal Distrito DistritoDe(int gx, int gz)
    {
        if (gradeDistrito == null) return Distrito.Centro;
        gx = Mathf.Clamp(gx, 0, quadrasX - 1);
        gz = Mathf.Clamp(gz, 0, quadrasZ - 1);
        return gradeDistrito[gx, gz];
    }

    private void PreencherQuadraComPredios(Transform quadraPai, float tamanho, Distrito dist, int gx, int gz)
    {
        if (dist == Distrito.Shopping) return; // Shopping.cs constrói as 2 quadras
        if (dist == Distrito.Industrial && criarPortoIndustrial && criarPorto) return;
        if (criarObraComGrua && gx == quadraObra.x && gz == quadraObra.y)
        {
            GerarQuadraObra(quadraPai, tamanho);
            return;
        }

        float areaUtil = tamanho - recuoCalcada * 2f;
        if (areaUtil <= 4f) return;

        int colunas = dist == Distrito.Centro ? 2 : UnityEngine.Random.Range(1, 3);
        int linhas = dist == Distrito.Industrial ? 1 : UnityEngine.Random.Range(1, 3);

        float larguraCelula = (areaUtil - margemEntrePredios * (colunas - 1)) / colunas;
        float profundidadeCelula = (areaUtil - margemEntrePredios * (linhas - 1)) / linhas;
        if (larguraCelula < 2.5f || profundidadeCelula < 2.5f) return;

        for (int c = 0; c < colunas; c++)
        {
            for (int l = 0; l < linhas; l++)
            {
                if (dist != Distrito.Centro && UnityEngine.Random.value < 0.08f) continue;

                float posX = -areaUtil * 0.5f + larguraCelula * 0.5f + c * (larguraCelula + margemEntrePredios);
                float posZ = -areaUtil * 0.5f + profundidadeCelula * 0.5f + l * (profundidadeCelula + margemEntrePredios);

                ObterAlturaETipoPorDistrito(dist, out float altura, out TipoFachada tipo, out bool ehCasaBaixa);
                int andares = Mathf.Max(1, Mathf.RoundToInt(altura / metrosPorAndar));
                if (ehCasaBaixa) andares = Mathf.Min(andares, 2);
                altura = andares * metrosPorAndar;

                float escalaX = larguraCelula * UnityEngine.Random.Range(0.78f, 0.96f);
                float escalaZ = profundidadeCelula * UnityEngine.Random.Range(0.78f, 0.96f);

                ConstruirEdificioDetalhado(quadraPai, new Vector3(posX, TopoCalcada(false), posZ),
                    escalaX, escalaZ, altura, andares, tipo, dist, c * 10 + l);
            }
        }
    }

    private void ObterAlturaETipoPorDistrito(Distrito dist, out float altura, out TipoFachada tipo, out bool ehCasa)
    {
        ehCasa = false;
        float minH = Mathf.Max(metrosPorAndar, alturaMinimaPredio);
        float maxH = Mathf.Max(alturaMaximaPredio, minH + 3f);

        switch (dist)
        {
            case Distrito.Centro:
                altura = UnityEngine.Random.Range(maxH * 0.85f, maxH * 1.65f);
                float rc = UnityEngine.Random.value;
                tipo = rc < 0.38f ? TipoFachada.ArranhaCeuEspelhado
                     : (rc < 0.72f ? TipoFachada.ComercialComTerreo : TipoFachada.Vidro);
                break;

            case Distrito.Comercial:
            case Distrito.Shopping:
                altura = UnityEngine.Random.Range(minH * 1.1f, maxH * 0.88f);
                float rm = UnityEngine.Random.value;
                tipo = rm < 0.40f ? TipoFachada.ComercialComTerreo
                     : (rm < 0.72f ? TipoFachada.Loja : TipoFachada.Janelas);
                break;

            case Distrito.Orla:
                altura = UnityEngine.Random.Range(minH, maxH * 0.75f);
                tipo = UnityEngine.Random.value < 0.55f ? TipoFachada.ResidencialComVarandas : TipoFachada.Vidro;
                break;

            case Distrito.Industrial:
                altura = UnityEngine.Random.Range(6f, 10f);
                tipo = TipoFachada.Galpao;
                break;

            default:
                ehCasa = UnityEngine.Random.value < 0.50f;
                altura = ehCasa ? UnityEngine.Random.Range(3f, 6f) : UnityEngine.Random.Range(minH, maxH * 0.58f);
                tipo = ehCasa ? TipoFachada.Casa : (UnityEngine.Random.value < 0.6f ? TipoFachada.ResidencialComVarandas : TipoFachada.Tijolo);
                break;
        }
    }
}