/////////////////////////////////////////////////////////////////////////
// Pixel shader for Final output
////////////////////////////////////////////////////////////////////////
#version 330

out vec4 FragColor;

vec3 LightingPixel();
void main()
{
    FragColor.xyz = LightingPixel();
}