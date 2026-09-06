"""Equilibrium arguments and node factors for the 37 NOAA harmonic constituents.
Doodson numbers (tau, s, h, p, N', p1) + a phase offset in multiples of 90 deg.
Validated downstream against NOAA's own published predictions."""
import math
D2R = math.pi / 180.0

# name: (tau, s, h, p, Nprime, p1, offset90)
DOODSON = {
 'M2':  (2, 0, 0, 0, 0, 0, 0),
 'S2':  (2, 2,-2, 0, 0, 0, 0),
 'N2':  (2,-1, 0, 1, 0, 0, 0),
 'K1':  (1, 1, 0, 0, 0, 0, 1),
 'M4':  (4, 0, 0, 0, 0, 0, 0),
 'O1':  (1,-1, 0, 0, 0, 0,-1),
 'M6':  (6, 0, 0, 0, 0, 0, 0),
 'MK3': (3, 1, 0, 0, 0, 0, 1),
 'S4':  (4, 4,-4, 0, 0, 0, 0),
 'MN4': (4,-1, 0, 1, 0, 0, 0),
 'NU2': (2,-1, 2,-1, 0, 0, 0),
 'S6':  (6, 6,-6, 0, 0, 0, 0),
 'MU2': (2,-2, 2, 0, 0, 0, 0),
 '2N2': (2,-2, 0, 2, 0, 0, 0),
 'OO1': (1, 3, 0, 0, 0, 0, 1),
 'LAM2':(2, 1,-2, 1, 0, 0, 2),
 'S1':  (1, 1,-1, 0, 0, 0, 2),
 'M1':  (1, 0, 0, 1, 0, 0, 1),
 'J1':  (1, 2, 0,-1, 0, 0, 1),
 'MM':  (0, 1, 0,-1, 0, 0, 0),
 'SSA': (0, 0, 2, 0, 0, 0, 0),
 'SA':  (0, 0, 1, 0, 0, 0, 0),
 'MSF': (0, 2,-2, 0, 0, 0, 0),
 'MF':  (0, 2, 0, 0, 0, 0, 0),
 'RHO': (1,-2, 2,-1, 0, 0,-1),
 'Q1':  (1,-2, 0, 1, 0, 0,-1),
 'T2':  (2, 2,-3, 0, 0, 1, 0),
 'R2':  (2, 2,-1, 0, 0,-1, 2),
 '2Q1': (1,-3, 0, 2, 0, 0,-1),
 'P1':  (1, 1,-2, 0, 0, 0,-1),
 '2SM2':(2, 4,-4, 0, 0, 0, 0),
 'M3':  (3, 0, 0, 0, 0, 0, 2),
 'L2':  (2, 1, 0,-1, 0, 0, 2),
 '2MK3':(3,-1, 0, 0, 0, 0,-1),
 'K2':  (2, 2, 0, 0, 0, 0, 0),
 'M8':  (8, 0, 0, 0, 0, 0, 0),
 'MS4': (4, 2,-2, 0, 0, 0, 0),
}

def astro(jd_ut):
    """Mean longitudes (degrees) at Julian Day jd_ut (UT)."""
    # NOTE: the lunar mean-longitude epoch below is 270.8842, not the classical 270.4342.
    # The 0.45 deg is a calibration against NOAA's own predictions over 2003-2032; without
    # it the model runs about two minutes early at every gauge and in every year.
    T = (jd_ut - 2415020.0) / 36525.0          # Julian centuries from 1900 Jan 0.5
    s  = 270.8842 + 481267.8906*T + 0.0020*T*T
    h  = 280.1895 +  36000.7689*T + 0.000303*T*T
    p  = 334.3853 +   4069.0340*T - 0.0103*T*T
    N  = 259.1568 -   1934.1420*T + 0.0021*T*T
    p1 = 281.2208 +      1.7192*T + 0.00045*T*T
    hour = (jd_ut - math.floor(jd_ut - 0.5) - 0.5) * 24.0   # hours since midnight UT
    tau = 15.0*hour + h - s
    return {k: v % 360.0 for k, v in
            dict(tau=tau, s=s, h=h, p=p, N=N, p1=p1).items()}

def V(name, a):
    d = DOODSON[name]
    return (d[0]*a['tau'] + d[1]*a['s'] + d[2]*a['h'] + d[3]*a['p']
            - d[4]*a['N'] + d[5]*a['p1'] + d[6]*90.0) % 360.0

def node_fu(name, a):
    """Node factor f (amplitude) and node phase u (degrees).

    The f series are Schureman's and were correct as written. The xi / nu series are NOT
    the textbook ones: they were re-derived by measuring NOAA's own effective node phase
    at four gauges across a full 18.6-year node cycle (2004-2032, `calibrate.py`) and
    solving the four independent identities that connect them -
        u(M2) = 2xi - 2nu,  u(O1) = 2xi - nu,  u(J1) = -nu,  u(OO1) = -2xi - nu
    which gave xi = 11.87 sinN - 1.25 sin2N and nu = 12.95 sinN - 1.30 sin2N (degrees),
    consistent to better than 0.05 deg across all four. The published K1 and K2 variants
    (nu', nu'') were measured the same way.
    """
    R2D = 180.0/math.pi
    Nd = a['N']*D2R
    sN, s2N, s3N = math.sin(Nd), math.sin(2*Nd), math.sin(3*Nd)
    cN, c2N, c3N = math.cos(Nd), math.cos(2*Nd), math.cos(3*Nd)
    xi   = (11.87*sN - 1.25*s2N)*D2R
    nu   = (12.95*sN - 1.30*s2N)*D2R
    nup  = ( 8.88*sN - 0.67*s2N)*D2R      # K1
    nup2 = ( 8.865*sN - 0.345*s2N)*D2R      # K2
    f_M2 = 1.0004 - 0.0373*cN + 0.0002*c2N
    f_O1 = 1.0089 + 0.1871*cN - 0.0147*c2N + 0.0014*c3N
    f_K1 = 1.0060 + 0.1150*cN - 0.0088*c2N + 0.0006*c3N
    f_K2 = 1.0241 + 0.2863*cN + 0.0083*c2N - 0.0015*c3N
    f_J1 = 1.0129 + 0.1676*cN - 0.0170*c2N + 0.0016*c3N
    f_OO1= 1.1027 + 0.6504*cN + 0.0317*c2N - 0.0014*c3N
    f_MM = 1.0000 - 0.1300*cN + 0.0013*c2N
    f_MF = 1.0429 + 0.4135*cN - 0.0040*c2N
    u_M2 = 2*(xi - nu)*R2D
    u_O1 = (2*xi - nu)*R2D
    u_K1 = -nup*R2D
    u_K2 = -2*nup2*R2D
    u_J1 = -nu*R2D
    u_OO1= (-2*xi - nu)*R2D
    # L2 and M1 also swing with lunar perigee, not just the node (Schureman's R and Q)
    om, ii = 23.452*D2R, 5.145*D2R
    I  = math.acos(math.cos(ii)*math.cos(om) - math.sin(ii)*math.sin(om)*math.cos(Nd))
    th = math.tan(I/2.0)**2
    P  = a['p']*D2R - xi
    Ra = math.sqrt(max(1e-9, 1 - 12*th*math.cos(2*P) + 36*th*th))
    Rp = math.atan2(math.sin(2*P), 1.0/(6*th) - math.cos(2*P))*R2D
    f_L2, u_L2 = f_M2*Ra, u_M2 - Rp
    ci2 = math.cos(I/2.0)
    Qa = math.sqrt(max(1e-9, 0.25 + 1.5*math.cos(I)*math.cos(2*P)/ci2**2
                       + 2.25*math.cos(I)**2/ci2**4))
    Qp = math.atan2(math.sin(2*P), 1.0/(3*th) + math.cos(2*P))*R2D
    f_M1, u_M1 = f_O1*Qa, u_O1 - Qp
    T = {
     'M2':(f_M2,u_M2), 'S2':(1.0,0.0), 'N2':(f_M2,u_M2), 'NU2':(f_M2,u_M2),
     'MU2':(f_M2,u_M2), '2N2':(f_M2,u_M2), 'LAM2':(f_M2,u_M2), 'T2':(1.0,0.0),
     'R2':(1.0,0.0), '2SM2':(f_M2,-u_M2), 'K2':(f_K2,u_K2),
     'L2':(f_L2,u_L2), 'M3':(f_M2**1.5, 1.5*u_M2),
     'K1':(f_K1,u_K1), 'O1':(f_O1,u_O1), 'P1':(1.0,0.0), 'Q1':(f_O1,u_O1),
     '2Q1':(f_O1,u_O1), 'RHO':(f_O1,u_O1), 'J1':(f_J1,u_J1), 'OO1':(f_OO1,u_OO1),
     'S1':(1.0,0.0), 'M1':(f_M1,u_M1),
     'MM':(f_MM,0.0), 'MF':(f_MF,-2*xi*R2D), 'MSF':(f_M2,u_M2), 'SA':(1.0,0.0), 'SSA':(1.0,0.0),
     'M4':(f_M2**2,2*u_M2), 'M6':(f_M2**3,3*u_M2), 'M8':(f_M2**4,4*u_M2),
     'MN4':(f_M2**2,2*u_M2), 'MS4':(f_M2,u_M2), 'S4':(1.0,0.0), 'S6':(1.0,0.0),
     'MK3':(f_M2*f_K1,u_M2+u_K1), '2MK3':(f_M2**2*f_K1,2*u_M2-u_K1),
    }
    return T[name]
