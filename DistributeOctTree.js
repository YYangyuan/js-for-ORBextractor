//vk if an array which is composed of fast corners(jsfeat.keypoint_t(x,y,score,level,angle))


var ResultKey = DistributeOctTree(vk, 0, 752,0,  480, 500)

function DistributeOctTree(vToDistributeKeys, minX, maxX, minY, maxY, N, level) {
    const nIni = Math.round((maxX - minX) / (maxY - minY)) || 1;
    // console.log(nIni, minX, maxX, minY, maxY)
    //一个初始的节点的x方向有多少个像素
    const hX = (maxX - minX) / nIni;
    // console.log(minX, maxX, minY, maxY, hX)
    //存储有提取器节点的列表
    var lNodes = [];
    //存储初始提取器节点指针的vector
    //然后重新设置其大小
    // var vpIniNodes = new Array(nIni);// c++中存储的是指针地址，但是js无法获取到地址
    var vpIniNodes = [];// c++中存储的是指针地址，但是js无法获取到地址
    // Step 2 生成初始提取器节点
    for (let i = 0; i < nIni; i++) {
        //生成一个提取器节点
        var ni = new ExtractorNode();

        //设置提取器节点的图像边界
        //注意这里和提取FAST角点区域相同，都是“半径扩充图像”，特征点坐标从0 开始
        ni.UL = {'x': hX * i, 'y': 0};                       //UpLeft
        ni.UR = {'x': hX * (i + 1), 'y': 0};                       //UpRight
        ni.BL = {'x': ni.UL.x, 'y': maxY - minY};		        //BottomLeft
        ni.BR = {'x': ni.UR.x, 'y': maxY - minY};               //BottomRight

        //重设vkeys大小
        ni.vKeys = [];
        // ni.bNoMore = false;
        //将刚才生成的提取节点添加到列表中
        //虽然这里的ni是局部变量，但是由于这里的push_back()是拷贝参数的内容到一个新的对象中然后再添加到列表中
        //所以当本函数退出之后这里的内存不会成为“野指针”
        // lNodes.push(ni);
        lNodes[i] = ni;
        //存储这个初始的提取器节点句柄
        //c++版本中，存储的是ni的地址。vpIniNodes[i] = &lNodes.back();
        vpIniNodes[i] = ni;
    }

    // console.log(vpIniNodes.length, lNodes.length)

    // Step 3 将特征点分配到子提取器节点中
    for(let i=0; i<vToDistributeKeys.length;i++){
        let kp = vToDistributeKeys[i];
        vpIniNodes[Math.floor((kp.x/hX))].vKeys.push(kp)
    }

    // console.log(vpIniNodes[0].vKeys.length)
    // console.log(vpIniNodes[1].vKeys.length)

    // Step 4 遍历此提取器节点列表，标记那些不可再分裂的节点，删除那些没有分配到特征点的节点
    // ? 这个步骤是必要的吗？感觉可以省略，通过判断nIni个数和vKeys.size() 就可以吧
    for (let i = 0; i < nIni; i++) {
        // console.log(lNodes[i].vKeys.length)
        if (lNodes[i].vKeys.length === 1) {
            lNodes[i].bNoMore = true;
            i++;
            // } else if (!lNodes[i].vKeys.length) {
        } else if (!lNodes[i].vKeys) {
            lNodes.splice(i, 1);
        } else {
            i++;
        }
    }

    //结束标志位清空
    let bFinish = false;
    //记录迭代次数，只是记录，并未起到作用
    let iteration = 0;

    let vSizeAndPointerToNode = []; // 传递特征点数目

    while (!bFinish) {
        //更新迭代次数计数器，只是记录，并未起到作用
        iteration++;
        //保存当前节点个数，prev在这里理解为“保留”比较好
        let prevSize = lNodes.length;
        //重新定位迭代器指向列表头部
        let lit = 0
        //需要展开的节点计数，这个一直保持累计，不清零
        let nToExpand = 0;

        //这个变量记录了在一次分裂循环中，那些可以再继续进行分裂的节点中包含的特征点数目和其句柄
        vSizeAndPointerToNode = [];

        let nFlag = 0;
        let flag = 0;
        let lNodesLength = lNodes.length

        while (nFlag < lNodesLength) {
            if (lNodes[flag].bNoMore) {
                nFlag++;
                flag++;
            } else {
                //如果当前的提取器节点具有超过一个的特征点，那么就要进行继续细分
                let n1 = new ExtractorNode();
                let n2 = new ExtractorNode();
                let n3 = new ExtractorNode();
                let n4 = new ExtractorNode();
                lNodes[flag].DivideNode(n1, n2, n3, n4);
                //如果这里分出来的子区域中有特征点，那么就将这个子区域的节点添加到提取器节点的列表中
                //注意这里的条件是，有特征点即可
                if (n1.vKeys.length > 0) {
                    //注意这里也是添加到列表前面的
                    lNodes.push(n1);
                    //再判断其中子提取器节点中的特征点数目是否大于1
                    if (n1.vKeys.length > 1) {
                        //如果有超过一个的特征点，那么“待展开的节点计数++”
                        nToExpand++;
                        //保存这个特征点数目和节点指针的信息
                        // vSizeAndPointerToNode.push_back(make_pair(n1.vKeys.size(),&lNodes.front()));
                        vSizeAndPointerToNode.push(n1);
                    }
                }
                if (n2.vKeys.length > 0) {
                    lNodes.push(n2);
                    if (n2.vKeys.length > 1) {
                        nToExpand++;
                        // vSizeAndPointerToNode.push_back(make_pair(n2.vKeys.size(),&lNodes.front()));
                        vSizeAndPointerToNode.push(n2);
                        // lNodes.front().lit = lNodes.begin();
                    }
                }
                if (n3.vKeys.length > 0) {
                    lNodes.push(n3);
                    if (n3.vKeys.length > 1) {
                        nToExpand++;
                        // vSizeAndPointerToNode.push_back(make_pair(n3.vKeys.size(),&lNodes.front()));
                        vSizeAndPointerToNode.push(n3);
                        // lNodes.front().lit = lNodes.begin();
                    }
                }
                if (n4.vKeys.length > 0) {
                    lNodes.push(n4);
                    if (n4.vKeys.length > 1) {
                        nToExpand++;
                        // vSizeAndPointerToNode.push_back(make_pair(n4.vKeys.size(),&lNodes.front()));
                        vSizeAndPointerToNode.push(n4);
                        // lNodes.front().lit = lNodes.begin();
                    }
                }
                lNodes.splice(flag, 1);
                nFlag++;
            }
        }


        if (lNodes.length >= N 				//判断是否超过了要求的特征点数
            || lNodes.length === prevSize)	//prevSize中保存的是分裂之前的节点个数，如果分裂之前和分裂之后的总节点个数一样，说明当前所有的
            //节点区域中只有一个特征点，已经不能够再细分了
        {
            //停止标志置位
            bFinish = true;
        }
        else if ((lNodes.length + nToExpand * 3) > N) {
            lNodes.sort(function (m, n) {
                if (m.vKeys.length < n.vKeys.length) return -1
                else if (m.vKeys.length > n.vKeys.length) return 1
                else return 0
            })
            while (!bFinish) {

                prevSize = lNodes.length;
                var vPrevSizeAndPointerToNode = vSizeAndPointerToNode;
                // var vPrevSizeAndPointerToNode = deepCopy(vSizeAndPointerToNode);
                // var vPrevSizeAndPointerToNode = _.cloneDeep(vSizeAndPointerToNode);
                // var vPrevSizeAndPointerToNodePoint = deepCopy(vSizeAndPointerToNodePoint);

                vSizeAndPointerToNode = [];
                // vSizeAndPointerToNode.sort(function (m, n) {
                //     if (m.vKeys.length < n.vKeys.length) return -1
                //     else if (m.vKeys.length > n.vKeys.length) return 1
                //     else return 0
                // })
                vPrevSizeAndPointerToNode.sort(function (m, n) {
                    if (m.vKeys.length < n.vKeys.length) return -1
                    else if (m.vKeys.length > n.vKeys.length) return 1
                    else return 0
                })
                // console.log(vPrevSizeAndPointerToNode)
                //遍历这个存储了pair对的vector，注意是从后往前遍历
                for (let j = vPrevSizeAndPointerToNode.length - 1; j >= 0; j--) {
                    let n1 = new ExtractorNode();
                    let n2 = new ExtractorNode();
                    let n3 = new ExtractorNode();
                    let n4 = new ExtractorNode();
                    // ExtractorNode n1,n2,n3,n4;
                    //对每个需要进行分裂的节点进行分裂
                    // vPrevSizeAndPointerToNode[j].second->DivideNode(n1,n2,n3,n4);
                    // vPrevSizeAndPointerToNode[j].DivideNode(n1, n2, n3, n4);
                    vPrevSizeAndPointerToNode[j].DivideNode(n1, n2, n3, n4);
                    // lNodes[lNodes.length-1].DivideNode(n1, n2, n3, n4);
                    // Add childs if they contain points
                    //其实这里的节点可以说是二级子节点了，执行和前面一样的操作
                    if (n1.vKeys.length > 0) {
                        lNodes.unshift(n1);
                        if (n1.vKeys.length > 1) {
                            //因为这里还有对于vSizeAndPointerToNode的操作，所以前面才会备份vSizeAndPointerToNode中的数据
                            //为可能的、后续的又一次for循环做准备
                            // vSizeAndPointerToNode.push_back(make_pair(n1.vKeys.size(),&lNodes.front()));
                            vSizeAndPointerToNode.push(n1);
                        }
                    }
                    if (n2.vKeys.length > 0) {
                        lNodes.unshift(n2);
                        if (n2.vKeys.length > 1) {
                            // vSizeAndPointerToNode.push_back(make_pair(n2.vKeys.size(),&lNodes.front()));
                            vSizeAndPointerToNode.push(n2);
                        }
                    }
                    if (n3.vKeys.length > 0) {
                        lNodes.unshift(n3);
                        if (n3.vKeys.length > 1) {
                            // vSizeAndPointerToNode.push_back(make_pair(n3.vKeys.size(),&lNodes.front()));
                            vSizeAndPointerToNode.push(n3);
                        }
                    }
                    if (n4.vKeys.length > 0) {
                        lNodes.unshift(n4);
                        if (n4.vKeys.length > 1) {
                            // vSizeAndPointerToNode.push_back(make_pair(n4.vKeys.size(),&lNodes.front()));
                            vSizeAndPointerToNode.push(n4);
                        }
                    }
                    // lNodes.splice(j, 1);
                    lNodes.pop()
                    if(lNodes.length>=N)
                        break;
                }
                if(lNodes.length>=N || lNodes.length===prevSize)
                    bFinish = true;
            }

        }

    }
    // console.log(lNodes)

    var vResultKeys = [];

    //遍历这个节点列表
    for(let lit=0; lit<lNodes.length; lit++)
    {
        //得到这个节点区域中的特征点容器句柄
        let vNodeKeys = lNodes[lit].vKeys;

        //得到指向第一个特征点的指针，后面作为最大响应值对应的关键点
        let pKP = vNodeKeys[0];

        //用第1个关键点响应值初始化最大响应值
        let maxResponse = pKP.score;

        //开始遍历这个节点区域中的特征点容器中的特征点，注意是从1开始哟，0已经用过了
        for(let k=1;k<vNodeKeys.length;k++)
        {
            //更新最大响应值
            if(vNodeKeys[k].score>maxResponse)
            {
                //更新pKP指向具有最大响应值的keypoints
                pKP = vNodeKeys[k];
                maxResponse = vNodeKeys[k].score;
            }
        }

        //将这个节点区域中的响应值最大的特征点加入最终结果容器
        vResultKeys.push(pKP);
    }


    // console.log(vResultKeys)
    //返回最终结果容器，其中保存有分裂出来的区域中，我们最感兴趣、响应值最大的特征点
    return vResultKeys;

}
class ExtractorNode{
    constructor() {
        // 下面的这几个参数需要设定初始值
        this.UL = {'x': 0, 'y': 0};
        this.UR = {'x': 0, 'y': 0};
        this.BL = {'x': 0, 'y': 0};
        this.BR = {'x': 0, 'y': 0};
        this.bNoMore = false;
        this.vKeys = []; // vKeys是一个数组，里面存放着每一个关键点的信息,关键点信息类型是new jsfeat.keypoint_t(0, 0, 0, lev, -1);。
        // c++中是std::vector<cv::KeyPoint> vKeys;
    }

    /**
     * @brief 将提取器节点分成4个子节点，同时也完成图像区域的划分、特征点归属的划分，以及相关标志位的置位
     *
     * @param[in & out] n1  提取器节点1：左上
     * @param[in & out] n2  提取器节点1：右上
     * @param[in & out] n3  提取器节点1：左下
     * @param[in & out] n4  提取器节点1：右下
     */
    DivideNode(n1, n2, n3, n4){
        //得到当前提取器节点所在图像区域的一半长宽，当然结果需要取整
        const halfX = Math.ceil((this.UR.x-this.UL.x)/2);
        const halfY = Math.ceil((this.BR.y-this.UL.y)/2);
        // bNoMore = false;
        //Define boundaries of childs
        //下面的操作大同小异，将一个图像区域再细分成为四个小图像区块
        //n1 存储左上区域的边界
        n1.UL = this.UL;
        n1.UR = {'x':this.UL.x+halfX, 'y':this.UL.y};
        n1.BL = {'x':this.UL.x,       'y':this.UL.y+halfY};
        n1.BR = {'x':this.UL.x+halfX, 'y':this.UL.y+halfY};
        //用来存储在该节点对应的图像网格中提取出来的特征点的vector
        n1.vKeys = [];
        n1.bNoMore = false;

        //n2 存储右上区域的边界
        n2.UL = n1.UR;
        n2.UR = this.UR;
        n2.BL = n1.BR;
        n2.BR = {'x': this.UR.x, 'y': this.UL.y+halfY};
        n2.vKeys = [];
        n2.bNoMore = false;

        //n3 存储左下区域的边界
        n3.UL = n1.BL;
        n3.UR = n1.BR;
        n3.BL = this.BL;
        n3.BR = {'x': n1.BR.x, 'y': this.BL.y};
        n3.vKeys = [];
        n3.bNoMore = false;

        //n4 存储右下区域的边界
        n4.UL = n3.UR;
        n4.UR = n2.BR;
        n4.BL = n3.BR;
        n4.BR = this.BR;
        n4.vKeys = [];
        n4.bNoMore = false;

        // console.log(this.vKeys)
        //Associate points to childs
        //遍历当前提取器节点的vkeys中存储的特征点
        for(var i=0;i<this.vKeys.length;i++)
        {
            //获取这个特征点对象
            var kp = this.vKeys[i];
            //判断这个特征点在当前特征点提取器节点图像的哪个区域，更严格地说是属于那个子图像区块
            //然后就将这个特征点追加到那个特征点提取器节点的vkeys中
            //NOTICE BUG REVIEW 这里也是直接进行比较的，但是特征点的坐标是在“半径扩充图像”坐标系下的，而节点区域的坐标则是在“边缘扩充图像”坐标系下的
            if(kp.x<n1.UR.x)
            {
                if(kp.y<n1.BR.y)
                    n1.vKeys.push(kp);
                else
                    n3.vKeys.push(kp);
            }
            else if(kp.y<n1.BR.y)
                n2.vKeys.push(kp);
            else
                n4.vKeys.push(kp);
        }//遍历当前提取器节点的vkeys中存储的特征点

        //判断每个子特征点提取器节点所在的图像中特征点的数目（就是分配给子节点的特征点数目），然后做标记
        //这里判断是否数目等于1的目的是确定这个节点还能不能再向下进行分裂
        if(n1.vKeys.length===1)
            n1.bNoMore = true;
        if(n2.vKeys.length===1)
            n2.bNoMore = true;
        if(n3.vKeys.length===1)
            n3.bNoMore = true;
        if(n4.vKeys.length===1)
            n4.bNoMore = true;
    }

    // return {
    //     DivideNode: DivideNode
    // }

}
function computeOrientation(image, keypoints)
{
    // 遍历所有的特征点
    var count = keypoints.length;
    // calculate dominant orientation for each keypoint
    for (var i = 0; i < count; ++i) {
        // 调用IC_Angle 函数计算这个特征点的方向
        keypoints[i].angle = IC_Angle(image, keypoints[i].x, keypoints[i].y);
    }
    return keypoints;
}
function IC_Angle(img, px, py) {
    var half_k = 15; // half patch size
    var m_01 = 0, m_10 = 0;
    var src = img.data, step = img.cols;
    var u = 0, v = 0, center_off = (py * step + px) | 0;
    var v_sum = 0, d = 0, val_plus = 0, val_minus = 0;

    // Treat the center line differently, v=0
    for (u = -half_k; u <= half_k; ++u)
        m_10 += u * src[center_off + u];

    // Go line by line in the circular patch
    for (v = 1; v <= half_k; ++v) {
        // Proceed over the two lines
        v_sum = 0;
        d = umax[v];
        for (u = -d; u <= d; ++u) {
            val_plus = src[center_off + u + v * step];
            val_minus = src[center_off + u - v * step];
            v_sum += (val_plus - val_minus);
            m_10 += u * (val_plus + val_minus);
        }
        m_01 += v * v_sum;
    }
    return Math.atan2(m_01, m_10);
}
