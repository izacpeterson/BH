ffmpeg -framerate 30 -i output/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 output.mp4

ffmpeg -i bloom.mp4 -vf "
    split=2[a][b]; 
    [b]gblur=sigma=50, 
       eq=brightness=0.05:contrast=1.2[glow]; 
    [a][glow]blend=all_mode=lighten" bloom2.mp4

ffmpeg -i output.mp4 -vf "minterpolate='mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'" final.mp4

ffmpeg -i output.mp4 -vf "eq=brightness=0.05:saturation=1.5, gblur=sigma=10, blend=all_mode=lighten" final.mp4

ffmpeg -i output.mp4 -vf "curves=preset=vintage,noise=c0s=10:c0f=t+u,format=yuv420p" old.mp4

ffmpeg -i old.mp4 -vf "colorbalance=bs=0.5" scratch.mp4

ffmpeg -i output.mp4 -vf "tmix=frames=5:weights='1 1 1 1 1'" blur.mp4

ffmpeg -i output.mp4 -filter_complex "[0:v]split=3[v1][v2][v3];[v1]setpts=PTS-1/TB[v1];[v2]setpts=PTS-2/TB[v2];[v3]setpts=PTS-3/TB[v3];[v1][v2][v3]blend=all_mode=average" blur.mp4
