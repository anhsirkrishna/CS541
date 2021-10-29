/////////////////////////////////////////////////////////////////////////
// Pixel shader for lighting
////////////////////////////////////////////////////////////////////////
#version 330

out vec4 FragColor;

const float PI = 3.14159f;

in vec4 position;

uniform int debugMode;

void main()
{
    gl_FragData[0] = position;
}