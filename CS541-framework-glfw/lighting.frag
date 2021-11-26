/////////////////////////////////////////////////////////////////////////
// Pixel shader for lighting
////////////////////////////////////////////////////////////////////////
#version 330

// These definitions agree with the ObjectIds enum in scene.h
const int     nullId	= 0;
const int     skyId	= 1;
const int     seaId	= 2;
const int     groundId	= 3;
const int     roomId	= 4;
const int     boxId	= 5;
const int     frameId	= 6;
const int     lPicId	= 7;
const int     rPicId	= 8;
const int     teapotId	= 9;
const int     spheresId	= 10;
const int     floorId	= 11;

const int Phong_M = 0;
const int BRDF_M = 1;
const int GGX_M = 2;

const float PI = 3.14159f;

in vec3 normalVec, lightVec, eyeVec;
in vec2 texCoord;
in vec4 shadowCoord;
in vec3 tanVec;

uniform int objectId;
uniform int lightingMode;
uniform vec3 diffuse, specular;
uniform float shininess;
uniform vec3 light, ambient;
uniform int width, height;

uniform sampler2D shadowMap;
uniform sampler2D SkydomeTex;
uniform sampler2D ObjectTexture;
uniform sampler2D ObjectNMap;
uniform int hasTexture, hasNMap;

vec3 LightingPixel()
{
    vec3 N = normalize(normalVec);
    vec3 L = normalize(lightVec);
    vec3 V = normalize(eyeVec);
    vec3 H = normalize(L+V);

    vec3 returnColor;
    vec3 Kd = diffuse;

    if (objectId == skyId){
        vec2 uv = vec2(-atan(V.y, V.x)/(2*PI), acos(V.z)/PI);
        returnColor = texture2D(SkydomeTex, uv).xyz;
        return returnColor;
    }
    else if (objectId == seaId){
        vec3 R = -(2* dot(V, N) * N - V);
        vec2 uv = vec2(-atan(R.y, R.x)/(2*PI), acos(R.z)/PI);
        Kd = texture2D(SkydomeTex, uv).xyz;
    }

    if (hasTexture != -1){
        //Get color from texture
        vec2 uv = texCoord;

        if (objectId == groundId)
            uv *= 10;
        if (objectId == floorId)
            uv *= 5;
        if (objectId == roomId){
            uv = uv.yx;
            uv *= 50;
        }
        if (objectId == rPicId){
            if (texCoord.x < 0.1){
                Kd = vec3(0.7, 0.7, 0.7);
            }
            else if (texCoord.y < 0.1){
                Kd = vec3(0.7, 0.7, 0.7);
            }
            else if (texCoord.x > 0.9){
                Kd = vec3(0.7, 0.7, 0.7);
            }
            else if (texCoord.y > 0.9){
                Kd = vec3(0.7, 0.7, 0.7);
            }  
            else{
                uv.x -= 0.05;
                uv.y -= 0.1;
                uv /= 0.8;
                Kd = texture2D(ObjectTexture, uv).xyz;
            }
        }
        else if (objectId == lPicId){
            uv *= 100;
            if ((mod(uv.x, 20) > 5) && mod(uv.y, 20) > 5)
                Kd = vec3(0.6, 0.0, 0.9);
            else if ( uv.x < (uv.y + 10) && uv.x > (uv.y - 10))
                Kd = vec3(0,0,0);
            else
                Kd = vec3(0.3, 0.0, 0.0);
        }
        else
            Kd = texture2D(ObjectTexture, uv).xyz;
    }

    if (hasNMap != -1){
        vec2 uv = texCoord;
        if (objectId == groundId)
            uv *= 10;
        if (objectId == floorId)
            uv *= 5;
        if (objectId == roomId){
            uv = uv.yx;
            uv *= 50;
        }
        if (objectId == seaId){
            uv = uv.yx;
            uv *= 500;
        }
        vec3 delta = texture2D(ObjectNMap, uv).xyz;
        delta = delta*2.0 - vec3(1, 1, 1);
        vec3 T = normalize(tanVec);
        vec3 B = normalize(cross(T, N));
        N = delta.x*T + delta.y*B + delta.z*N;
        N = normalize(N);
    }
        
    float alpha;
    float light_depth, pixel_depth;
    vec2 shadowIndex;
    if (shadowCoord.w > 0){
        shadowIndex = shadowCoord.xy/shadowCoord.w;
    }
    pixel_depth = 0;
    light_depth = 1000;
    if (shadowIndex.x >= 0 && shadowIndex.x <= 1){
        if (shadowIndex.y >= 0 && shadowIndex.y <= 1){
            light_depth = texture2D(shadowMap, shadowIndex).w;
            pixel_depth = shadowCoord.w;
        }
    }
    // A checkerboard pattern to break up larte flat expanses.  Remove when using textures.
    //if (objectId==groundId || objectId==floorId || objectId==seaId) {
    //    ivec2 uv = ivec2(floor(100.0*texCoord));
    //    if ((uv[0]+uv[1])%2==0)
    //        Kd *= 0.9; }
    
    float LN = max(dot(L, N), 0.0);
    float NH = max(dot(N, H), 0.0);
    float LH = max(dot(L, H), 0.0);
    if (lightingMode == Phong_M){
        alpha = -2 + (2/(shininess*shininess));
        if (pixel_depth > (light_depth + 0.01))
            returnColor = ambient*Kd;
        else
            returnColor = ambient*Kd + light*(Kd/PI)*LN + light*(specular*10)*pow(NH, alpha);
        //specular value coming in is for BRDF so adjust for Phong by multiplying by 10
    }
    else {
        vec3 brdf;
        float distribution;
        
        vec3 fresnel = specular + ((vec3(1,1,1) - specular)*pow((1-LH), 5));
        float visibility = 1/(LH*LH);

        if (lightingMode == BRDF_M){
            alpha = -2 + (2/(shininess*shininess));
            distribution = ((alpha+2)/(2*PI))*pow(NH, alpha);
        }
        else if (lightingMode == GGX_M){
            alpha = pow(shininess, 2);
            distribution = alpha / (PI * pow(pow(NH, 2) * (alpha - 1) + 1, 2));
        }

        brdf = (Kd/PI) + ((fresnel*visibility*distribution)/4);
        if (pixel_depth > (light_depth + 0.01))
            returnColor = ambient*Kd;
        else
            returnColor = ambient*Kd + light*LN*brdf;
    }

	return returnColor;
}
